import mongoose from "mongoose";

const sensorEventSchema = new mongoose.Schema({
  sensorId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  data: {
    type: new mongoose.Schema(
      {
        distance: {
          type: Number,
          required: true,
        },
        duration: {
          type: Number,
          required: true,
        },
      },
      { _id: false },
    ),
    required: true,
  },
});

const SensorEvent = mongoose.model("SensorEvent", sensorEventSchema);

export default SensorEvent;