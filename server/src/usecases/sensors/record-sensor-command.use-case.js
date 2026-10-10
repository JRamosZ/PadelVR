import {ApplicationError} from "../../domain/errors/application.error.js";
import {MatchEngineError, transitionMatch} from "../../domain/match-engine/match-engine.js";

const COMMANDS = new Set(["ADD_POINT", "UNDO_POINT"]);
const TEAMS = ["A", "B"];
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function validateCommand(request) {
  const {commandId, sensorId, command, sequence, timestamp} = request ?? {};

  if (
    typeof commandId !== "string" ||
    commandId.trim().length === 0 ||
    commandId.length > 128 ||
    typeof sensorId !== "string" ||
    sensorId.trim().length === 0 ||
    sensorId.length > 100 ||
    !COMMANDS.has(command) ||
    !Number.isSafeInteger(sequence) ||
    sequence < 0 ||
    typeof timestamp !== "string" ||
    !ISO_TIMESTAMP_PATTERN.test(timestamp) ||
    Number.isNaN(Date.parse(timestamp))
  ) {
    throw new ApplicationError("Invalid sensor command payload.", 400, {
      code: "INVALID_SENSOR_COMMAND",
    });
  }

  return {
    commandId: commandId.trim(),
    sensorId: sensorId.trim(),
    command,
    sequence,
    timestamp: new Date(timestamp),
  };
}

function sameCommand(existing, command) {
  return existing.commandId === command.commandId &&
    existing.sensorId === command.sensorId &&
    existing.sequence === command.sequence &&
    existing.command === command.command;
}

function resolveTeam(sensorSide, state) {
  const team = TEAMS.find((candidate) => state.sideChange?.currentSides?.[candidate] === sensorSide);
  if (!team) {
    throw new ApplicationError("The sensor side is not configured for this match.", 409, {
      code: "SENSOR_SIDE_NOT_CONFIGURED",
    });
  }
  return team;
}

function duplicateResult(existing, command) {
  if (!sameCommand(existing, command)) {
    throw new ApplicationError("The command ID or sensor sequence was already used.", 409, {
      code: "SENSOR_COMMAND_CONFLICT",
    });
  }
  return {
    duplicate: true,
    commandId: command.commandId,
    matchId: existing.matchId.toString(),
  };
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

export function createRecordSensorCommandUseCase({
  courtRepository,
  matchRepository,
  sensorEventRepository,
  matchEventRepository,
  runTransaction,
  publishMatchUpdate,
  now = () => new Date(),
}) {
  return async function recordSensorCommand(request) {
    const command = validateCommand(request);

    try {
      const result = await runTransaction(async (session) => {
        const previous = await sensorEventRepository.findByCommandOrSequence({
          commandId: command.commandId,
          sensorId: command.sensorId,
          sequence: command.sequence,
          session,
        });
        if (previous) {
          return duplicateResult(previous, command);
        }

        const courts = await courtRepository.findBySensorId(command.sensorId, session);
        if (courts.length === 0) {
          throw new ApplicationError("Sensor is not registered to a court.", 404, {
            code: "SENSOR_NOT_FOUND",
          });
        }
        if (courts.length !== 1 || courts[0].sensorModules.length !== 1) {
          throw new ApplicationError("Sensor registration is ambiguous.", 409, {
            code: "SENSOR_REGISTRATION_AMBIGUOUS",
          });
        }
        const [court] = courts;
        const [sensorModule] = court.sensorModules;
        const match = await matchRepository.findLatestByCourtId(court.id, session);
        if (!match) {
          throw new ApplicationError("There is no match registered for the sensor's court.", 404, {
            code: "MATCH_NOT_FOUND",
          });
        }
        if (
          !["READY", "IN_PROGRESS"].includes(match.status) &&
          !(match.status === "FINISHED" && command.command === "UNDO_POINT")
        ) {
          throw new ApplicationError("The latest match cannot accept sensor commands.", 409, {
            code: "MATCH_NOT_ACCEPTING_COMMANDS",
          });
        }

        const latestSequence = await sensorEventRepository.findLatestSequence(
          command.sensorId,
          session,
        );
        if (latestSequence !== null && command.sequence <= latestSequence) {
          throw new ApplicationError("Sensor command sequence is stale.", 409, {
            code: "STALE_SENSOR_SEQUENCE",
          });
        }
        if (match.status === "READY" && command.command !== "ADD_POINT") {
          throw new ApplicationError("The first sensor command must add a point.", 409, {
            code: "MATCH_NOT_STARTED",
          });
        }

        const team = command.command === "ADD_POINT"
          ? resolveTeam(sensorModule.side, match.state)
          : undefined;
        const startedAt = match.status === "READY" ? now() : match.startedAt ?? null;
        const transition = transitionMatch({
          status: "IN_PROGRESS",
          state: match.state,
          history: match.history,
          format: match.format,
          rules: match.rules,
          command: {type: command.command, ...(team ? {team} : {})},
        });

        if (match.status === "READY") {
          const firstPoint = transition.state.undoHistory.at(-1);
          if (firstPoint) firstPoint.before.status = "READY";
        }

        const processedAt = now();
        const persistedMatch = await matchRepository.persistSensorTransition({
          match,
          transition,
          startedAt: transition.status === "READY" ? null : startedAt,
          finishedAt: transition.status === "FINISHED" ? processedAt : null,
          session,
        });
        if (!persistedMatch) {
          throw new ApplicationError("Match changed while processing the sensor command.", 409, {
            code: "MATCH_STATE_CONFLICT",
          });
        }

        await matchEventRepository.createMany(
          transition.events.map((event) => ({
            matchId: match._id,
            type: event.type,
            ...(event.team ? {team: event.team} : {}),
            details: event.details,
            timestamp: processedAt,
          })),
          session,
        );
        await sensorEventRepository.create(
          {
            ...command,
            matchId: match._id,
          },
          session,
        );

        return {
          duplicate: false,
          commandId: command.commandId,
          matchId: match.id,
          status: persistedMatch.status,
          revision: persistedMatch.revision,
          state: persistedMatch.state,
          history: persistedMatch.history,
          events: transition.events,
          processedAt,
        };
      });

      if (!result.duplicate) {
        publishMatchUpdate(result.matchId, {
          type: "match.updated",
          matchId: result.matchId,
          status: result.status,
          revision: result.revision,
          state: result.state,
          history: result.history,
          events: result.events,
          updatedAt: result.processedAt,
        });
      }
      return result;
    } catch (error) {
      if (error instanceof MatchEngineError) {
        throw new ApplicationError(error.message, 409, {code: error.code});
      }
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      const existing = await sensorEventRepository.findByCommandOrSequence({
        commandId: command.commandId,
        sensorId: command.sensorId,
        sequence: command.sequence,
      });
      if (existing) {
        return duplicateResult(existing, command);
      }
      throw new ApplicationError("Sensor command conflicts with an existing command.", 409, {
        code: "SENSOR_COMMAND_CONFLICT",
      });
    }
  };
}
