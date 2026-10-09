import {ApplicationError} from "../../domain/errors/application.error.js";
import {isMongoObjectId} from "../../domain/validation/is-mongo-object-id.js";

const ACTIVE_MATCH_STATUSES = new Set(["READY", "IN_PROGRESS", "PAUSED"]);
const PHOTO_DATA_URL_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,[a-z\d+/]+=*$/i;
const MAX_PHOTO_DATA_URL_LENGTH = 1_400_000;

function buildCustomMode(settings) {
  if (
    !settings ||
    ![1, 2].includes(settings.setsToWin) ||
    settings.gamesToWinSet !== 6 ||
    !["PREMIER", "NO_AD"].includes(settings.gameScoring) ||
    typeof settings.tieBreakEnabled !== "boolean" ||
    typeof settings.starPointEnabled !== "boolean"
  ) {
    throw new ApplicationError("Invalid custom match settings.", 400);
  }

  if (settings.gameScoring === "NO_AD" && settings.starPointEnabled) {
    throw new ApplicationError("Star point cannot be enabled with no-ad scoring.", 400);
  }

  return {
    format: {
      type: settings.setsToWin === 1 ? "SINGLE_SET" : "BEST_OF_THREE",
      setsToWin: settings.setsToWin,
      gamesToWinSet: settings.gamesToWinSet,
    },
    rules: {
      gameScoring: settings.gameScoring,
      starPoint: {
        enabled: settings.starPointEnabled,
        advantagesBeforeStarPoint: settings.starPointEnabled ? 2 : 0,
      },
      tieBreak: {
        enabled: settings.tieBreakEnabled,
        triggerAtGames: 6,
        pointsToWin: 7,
        winByPoints: 2,
      },
      sideChange: {
        enabled: true,
        policy: "STANDARD",
      },
    },
  };
}

function normalizeTeams(teams) {
  if (
    !Array.isArray(teams) ||
    teams.length !== 2 ||
    !["A", "B"].every((side) => teams.some((team) => team?.id === side))
  ) {
    throw new ApplicationError("Two teams with IDs A and B are required.", 400);
  }

  return ["A", "B"].map((side) => {
    const team = teams.find((candidate) => candidate.id === side);

    if (!Array.isArray(team.players) || team.players.length !== 2) {
      throw new ApplicationError("Each team must have exactly two players.", 400);
    }

    return {
      id: side,
      players: team.players.map((player, index) => {
        const name = typeof player?.name === "string" ? player.name.trim() : "";
        const photo = typeof player?.photo === "string" ? player.photo : "";

        if (!name || name.length > 40) {
          throw new ApplicationError("Each player must have a name of 1 to 40 characters.", 400);
        }

        if (
          photo &&
          (photo.length > MAX_PHOTO_DATA_URL_LENGTH || !PHOTO_DATA_URL_PATTERN.test(photo))
        ) {
          throw new ApplicationError("Player photos must be valid, compressed image data.", 400);
        }

        return {
          id: `${side}-${index + 1}`,
          name,
          photo,
        };
      }),
    };
  });
}

export function createCreateMatchUseCase({courtRepository, matchRepository, matchModes}) {
  return async function createMatch(courtId, request) {
    if (!isMongoObjectId(courtId)) {
      throw new ApplicationError("Invalid court ID.", 400);
    }

    const court = await courtRepository.findById(courtId);
    if (!court) {
      throw new ApplicationError("Court not found.", 404);
    }
    if (court.status !== "AVAILABLE") {
      throw new ApplicationError("Court is not available.", 409);
    }

    const isCustomMode = request?.modeId === "CUSTOM";
    const mode = isCustomMode ? null : matchModes[request?.modeId];
    if (!isCustomMode && !mode) {
      throw new ApplicationError("Select a valid match mode.", 400);
    }

    const configuration =
      isCustomMode
        ? buildCustomMode(request.customSettings)
        : {format: mode.format, rules: mode.rules};

    if (!configuration.format || !configuration.rules) {
      throw new ApplicationError("Match mode configuration is incomplete.", 400);
    }

    const teams = normalizeTeams(request.teams);
    const latestMatch = await matchRepository.findLatestByCourtId(courtId);
    const activeMatch =
      latestMatch && ACTIVE_MATCH_STATUSES.has(latestMatch.status) ? latestMatch : null;

    if (activeMatch && request.finishActiveMatchId !== activeMatch.id) {
      throw new ApplicationError(
        "Confirm finishing the current match before creating a new one.",
        409,
        {
          code: "ACTIVE_MATCH_CONFIRMATION_REQUIRED",
          activeMatch: {id: activeMatch.id, status: activeMatch.status},
        },
      );
    }

    if (!activeMatch && request.finishActiveMatchId) {
      throw new ApplicationError(
        "The current match changed. Review the court and try again.",
        409,
        {code: "ACTIVE_MATCH_CHANGED"},
      );
    }

    if (
      activeMatch &&
      !(await matchRepository.finishActiveMatch(courtId, activeMatch.id))
    ) {
      throw new ApplicationError(
        "The current match changed. Review the court and try again.",
        409,
        {code: "ACTIVE_MATCH_CHANGED"},
      );
    }

    const createdMatch = await matchRepository.create({
      courtId,
      status: "READY",
      format: configuration.format,
      rules: configuration.rules,
      teams,
      state: {
        setsWon: {A: 0, B: 0},
        currentSet: {
          number: 1,
          games: {A: 0, B: 0},
        },
        currentGame: {
          type: "REGULAR",
          points: {A: "0", B: "0"},
          tieBreakPoints: null,
          advantagesPlayed: 0,
          tieBreakFirstServer: null,
        },
        server: {
          team: "A",
          playerId: "A-1",
        },
        serviceOrder: {
          A: "A-1",
          B: "B-1",
        },
        undoHistory: [],
        sideChange: {
          enabled: configuration.rules.sideChange.enabled,
          currentSides: {A: "LEFT", B: "RIGHT"},
          pending: false,
        },
      },
      history: {completedSets: []},
      startedAt: null,
      finishedAt: null,
    });

    return {
      id: createdMatch.id,
      status: createdMatch.status,
    };
  };
}
