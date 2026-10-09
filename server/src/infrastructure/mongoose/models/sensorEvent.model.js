import mongoose from "mongoose";

const sensorEventSchema = new mongoose.Schema(
  {
    commandId: {
      type: String,
      required: true,
      trim: true,
    },
    sensorId: {
      type: String,
      required: true,
      trim: true,
    },
    sequence: {
      type: Number,
      min: 0,
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
    timestamps: {createdAt: "receivedAt", updatedAt: false},
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  },
);

sensorEventSchema.index({commandId: 1}, {unique: true});
sensorEventSchema.index({sensorId: 1, sequence: 1}, {unique: true});

const SensorEvent = mongoose.model("SensorEvent", sensorEventSchema);

export default SensorEvent;
