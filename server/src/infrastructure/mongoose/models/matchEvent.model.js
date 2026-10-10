import mongoose from "mongoose";

const EVENT_TYPES = [
  "POINT_WON",
  "POINT_UNDONE",
  "GAME_WON",
  "SET_WON",
  "MATCH_WON",
  "SIDE_CHANGED",
];

const matchEventSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Match",
    required: true,
  },
  type: {
    type: String,
    enum: EVENT_TYPES,
    required: true,
  },
  team: {
    type: String,
    enum: ["A", "B"],
    required() {
      return this.type !== "SIDE_CHANGED";
    },
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
});

const MatchEvent = mongoose.model("MatchEvent", matchEventSchema);

export default MatchEvent;