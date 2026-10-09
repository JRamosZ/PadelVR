import mongoose from "mongoose";

export function createHealthRepository() {
  return {
    async getDatabaseStatus() {
      return mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    },
  };
}
