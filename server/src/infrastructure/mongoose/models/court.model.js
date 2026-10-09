import mongoose from "mongoose";

const sensorModuleSchema = new mongoose.Schema(
  {
    sensorId: {
      type: String,
      required: true,
    },
    side: {
      type: String,
      enum: ["LEFT", "RIGHT"],
      required: true,
    },
    esp32Id: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const courtSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    required: true,
    default: "AVAILABLE",
  },
  sensorModules: {
    type: [sensorModuleSchema],
    default: [],
  },
});

const Court = mongoose.model("Court", courtSchema);

export default Court;
