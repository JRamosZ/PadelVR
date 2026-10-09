import mongoose from "mongoose";

const sensorEventSchema = new mongoose.Schema(
  {
    sensorId: {
      type: String,
      required: true,
    },
    command: {
      type: String,
      enum: ["ADD_POINT", "UNDO_POINT"],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
    },
  },
  {
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  },
);

const SensorEvent = mongoose.model("SensorEvent", sensorEventSchema);

export default SensorEvent;
