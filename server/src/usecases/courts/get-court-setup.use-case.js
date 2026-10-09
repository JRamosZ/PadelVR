import {ApplicationError} from "../../domain/errors/application.error.js";
import {isMongoObjectId} from "../../domain/validation/is-mongo-object-id.js";

export function createGetCourtSetupUseCase(courtRepository, matchRepository) {
  return async function getCourtSetup(courtId) {
    if (!isMongoObjectId(courtId)) {
      throw new ApplicationError("Invalid court ID.", 400);
    }

    const court = await courtRepository.findById(courtId);

    if (!court) {
      throw new ApplicationError("Court not found.", 404);
    }

    const courtSummary = {
      id: court.id,
      name: court.name,
      status: court.status,
    };

    if (court.status !== "AVAILABLE") {
      return {court: courtSummary, match: null};
    }

    const match = await matchRepository.findLatestByCourtId(courtId);

    return {
      court: courtSummary,
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
