import CourtModel from "../models/court.model.js";

export function createCourtRepository() {
  return {
    async findAll() {
      const courts = await CourtModel.find({})
        .select("_id name status")
        .sort({name: 1, _id: 1})
        .lean();

      return courts.map((court) => ({
        id: court._id.toString(),
        name: court.name,
        status: court.status,
      }));
    },

    async findById(courtId) {
      const court = await CourtModel.findById(courtId)
        .select("_id name status")
        .lean();

      if (!court) return null;

      return {
        id: court._id.toString(),
        name: court.name,
        status: court.status,
      };
    },

    async existsById(courtId) {
      return Boolean(await CourtModel.exists({_id: courtId}));
    },

    async existsAny() {
      return Boolean(await CourtModel.exists({}));
    },

    async create(courtData) {
      return CourtModel.create(courtData);
    },
  };
}
