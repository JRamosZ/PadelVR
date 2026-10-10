import {ApplicationError} from "../../domain/errors/application.error.js";
import {getMatchStatistics} from "../../domain/match-engine/match-engine.js";
import {isMongoObjectId} from "../../domain/validation/is-mongo-object-id.js";

export function createGetMatchForScoreboardUseCase({courtRepository, matchRepository}) {
  return async function getMatchForScoreboard(courtId, matchId) {
    if (!isMongoObjectId(courtId) || !isMongoObjectId(matchId)) {
      throw new ApplicationError("Invalid court or match ID.", 400);
    }

    const match = await matchRepository.findByIdAndCourtId(matchId, courtId);
    if (!match) {
      throw new ApplicationError("Match not found for this court.", 404);
    }
    const court = await courtRepository.findByIdWithSensors(courtId);
    if (!court) {
      throw new ApplicationError("Court not found.", 404);
    }
    const state = {
      ...match.state,
      statistics: getMatchStatistics(match.state),
    };

    return {
      match: {
        id: match.id,
        status: match.status,
        format: match.format,
        rules: match.rules,
        teams: match.teams,
        state,
        history: match.history,
        revision: match.revision,
        startedAt: match.startedAt,
        finishedAt: match.finishedAt,
      },
      sensors: court.sensorModules,
    };
  };
}
