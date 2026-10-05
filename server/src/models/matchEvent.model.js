import mongoose from "mongoose";

const metadataSchema = new mongoose.Schema(
  {
    distance: Number,
    confidence: Number,
  },
  { _id: false },
);

const matchEventSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Match",
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  team: {
    type: String,
    enum: ["A", "B"],
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  sensorId: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  metadata: {
    type: metadataSchema,
    required: true,
  },
});

const MatchEvent = mongoose.model("MatchEvent", matchEventSchema);

export default MatchEvent;