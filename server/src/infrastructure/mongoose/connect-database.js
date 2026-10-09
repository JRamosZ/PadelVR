import mongoose from "mongoose";

export async function connectDatabase() {
  const {DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME} = process.env;
  const MONGODB_URI = `mongodb://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=admin`;

  if (DB_HOST === undefined || DB_PORT === undefined || DB_USERNAME === undefined || DB_PASSWORD === undefined || DB_NAME === undefined) {
    throw new Error("Database configuration is missing in environment variables.");
  }

  await mongoose.connect(MONGODB_URI);
  console.info("Connected to MongoDB.");
}
