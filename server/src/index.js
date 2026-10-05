import cors from "cors";
import "dotenv/config";
import express from "express";
import {seedCourts} from "./config/court.seeder.js";
import {connectDatabase} from "./config/database.js";
import healthRouter from "./routes/health.js";

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use("/api/health", healthRouter);

try {
  await connectDatabase();
  await seedCourts();
  app.listen(port, () => console.info(`API listening on http://localhost:${port}`));
} catch (error) {
  console.error("Failed to initialize the application:", error.message);
  process.exit(1);
}
