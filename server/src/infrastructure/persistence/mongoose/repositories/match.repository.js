import MatchModel from "../models/match.model.js";

export function createMatchRepository() {
  return {
    async findLatestByCourtId(courtId) {
      const match = await MatchModel.findOne({courtId})
        .sort({startedAt: -1, _id: -1})
        .select("_id status startedAt")
        .lean();

      if (!match) return null;

      return {
        id: match._id.toString(),
        status: match.status,
        startedAt: match.startedAt,
      };
    },
  };
}
