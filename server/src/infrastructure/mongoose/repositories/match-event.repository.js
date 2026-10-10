import MatchEventModel from "../models/matchEvent.model.js";

export function createMatchEventRepository() {
  return {
    async createMany(events, session) {
      if (events.length === 0) return [];
      return MatchEventModel.insertMany(events, {session, ordered: true});
    },
  };
}
