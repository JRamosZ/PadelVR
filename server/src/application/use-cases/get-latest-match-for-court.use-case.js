import {ApplicationError} from "../../domain/errors/application.error.js";
import {isMongoObjectId} from "../../domain/validation/is-mongo-object-id.js";

export function createGetLatestMatchForCourtUseCase(courtRepository, matchRepository) {
  return async function getLatestMatchForCourt(courtId) {
    if (!isMongoObjectId(courtId)) {
      throw new ApplicationError("Invalid court ID.", 400);
    }

    const courtExists = await courtRepository.existsById(courtId);

    if (!courtExists) {
      throw new ApplicationError("Court not found.", 404);
    }

    const match = await matchRepository.findLatestByCourtId(courtId);

    return {
      match: match
        ? {
            id: match.id,
            status: match.status,
            startedAt: match.startedAt,
          }
        : null,
    };
  };
}
