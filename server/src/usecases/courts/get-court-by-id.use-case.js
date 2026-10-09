import {ApplicationError} from "../../domain/errors/application.error.js";
import {isMongoObjectId} from "../../domain/validation/is-mongo-object-id.js";

export function createGetCourtByIdUseCase(courtRepository) {
  return async function getCourtById(courtId) {
    if (!isMongoObjectId(courtId)) {
      throw new ApplicationError("Invalid court ID.", 400);
    }

    const court = await courtRepository.findById(courtId);

    if (!court) {
      throw new ApplicationError("Court not found.", 404);
    }

    return {
      id: court.id,
      name: court.name,
      status: court.status,
    };
  };
}
