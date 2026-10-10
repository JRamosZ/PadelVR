import mongoose from "mongoose";
import SensorEventModel from "./models/sensorEvent.model.js";

export async function connectDatabase() {
  const {DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME} = process.env;
  const MONGODB_URI = `mongodb://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=admin`;

  if (DB_HOST === undefined || DB_PORT === undefined || DB_USERNAME === undefined || DB_PASSWORD === undefined || DB_NAME === undefined) {
    throw new Error("Database configuration is missing in environment variables.");
  }

  await mongoose.connect(MONGODB_URI);
  const topology = await mongoose.connection.db.admin().command({hello: 1});
  if (!topology.setName && topology.msg !== "isdbgrid") {
    await mongoose.disconnect();
    throw new Error("MongoDB must run as a replica set to support atomic sensor-command processing.");
  }
  await SensorEventModel.createIndexes();
  console.info("Connected to MongoDB.");
}
