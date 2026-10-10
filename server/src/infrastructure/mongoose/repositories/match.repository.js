import MatchModel from "../models/match.model.js";

export function createMatchRepository() {
  return {
    async findByIdAndCourtId(matchId, courtId) {
      const match = await MatchModel.findOne({_id: matchId, courtId})
        .select("_id status format rules teams state history revision startedAt finishedAt")
        .lean();
      if (!match) return null;
      return {
        ...match,
        id: match._id.toString(),
      };
    },

    async findLatestByCourtId(courtId, session) {
      let query = MatchModel.findOne({courtId})
        .sort({createdAt: -1, _id: -1})
        .select("_id courtId status format rules state history revision startedAt");
      if (session) query = query.session(session);
      const match = await query.lean();

      if (!match) return null;
      return {
        ...match,
        id: match._id.toString(),
        courtId: match.courtId.toString(),
      };
    },

    async findLatestActiveByCourtId(courtId) {
      const match = await MatchModel.findOne({
        courtId,
        status: {$in: ["READY", "IN_PROGRESS", "PAUSED"]},
      })
        .sort({createdAt: -1, _id: -1})
        .select("_id status startedAt")
        .lean();

      if (!match) return null;
      return {...match, id: match._id.toString()};
    },

    async findLatestFinishedByCourtId(courtId) {
      const match = await MatchModel.findOne({courtId, status: "FINISHED"})
        .sort({finishedAt: -1, _id: -1})
        .select("_id status finishedAt")
        .lean();

      if (!match) return null;
      return {...match, id: match._id.toString()};
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

    async persistSensorTransition({match, transition, startedAt, finishedAt, session}) {
      const update = {
        status: transition.status,
        state: transition.state,
        history: transition.history,
        startedAt,
        finishedAt,
      };

      const persistedMatch = await MatchModel.findOneAndUpdate(
        {_id: match._id, revision: match.revision ?? 0, status: match.status},
        {$set: update, $inc: {revision: 1}},
        {new: true, runValidators: true, session},
      ).lean();

      return persistedMatch;
    },
  };
}
