import MatchModel from "../models/match.model.js";

export function createMatchRepository() {
  return {
    async findLatestByCourtId(courtId) {
      const match = await MatchModel.findOne({courtId})
        .sort({createdAt: -1, _id: -1})
        .select("_id status startedAt")
        .lean();

      if (!match) return null;

      return {
        id: match._id.toString(),
        status: match.status,
        startedAt: match.startedAt,
      };
    },

    async create(matchData) {
      const match = await MatchModel.create(matchData);

      return {
        id: match._id.toString(),
        status: match.status,
        createdAt: match.createdAt,
      };
    },

    async finishActiveMatch(courtId, matchId) {
      const result = await MatchModel.findOneAndUpdate(
        {
          _id: matchId,
          courtId,
          status: {$in: ["READY", "IN_PROGRESS", "PAUSED"]},
        },
        {
          $set: {
            status: "FINISHED",
            finishedAt: new Date(),
          },
        },
        {new: true},
      )
        .select("_id")
        .lean();

      return Boolean(result);
    },
  };
}
