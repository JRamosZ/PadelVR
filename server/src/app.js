import cors from "cors";
import express from "express";
import {createGetCourtByIdUseCase} from "./application/use-cases/get-court-by-id.use-case.js";
import {createGetCourtSetupUseCase} from "./application/use-cases/get-court-setup.use-case.js";
import {createGetLatestMatchForCourtUseCase} from "./application/use-cases/get-latest-match-for-court.use-case.js";
import {createGetSystemHealthUseCase} from "./application/use-cases/get-system-health.use-case.js";
import {createSeedInitialCourtUseCase} from "./application/use-cases/seed-initial-court.use-case.js";
import {ApplicationError} from "./domain/errors/application.error.js";
import {connectDatabase} from "./infrastructure/persistence/mongoose/connect-database.js";
import {createCourtRepository} from "./infrastructure/persistence/mongoose/repositories/court.repository.js";
import {createHealthRepository} from "./infrastructure/persistence/mongoose/repositories/health.repository.js";
import {createMatchRepository} from "./infrastructure/persistence/mongoose/repositories/match.repository.js";
import {createCourtsController} from "./interfaces/http/controllers/courts.controller.js";
import {createHealthController} from "./interfaces/http/controllers/health.controller.js";
import {createCourtsRouter} from "./routes/courts.js";
import {createHealthRouter} from "./routes/health.js";

export function createApplication() {
  const app = express();
  const courtRepository = createCourtRepository();
  const matchRepository = createMatchRepository();
  const healthRepository = createHealthRepository();

  const getCourtById = createGetCourtByIdUseCase(courtRepository);
  const getLatestMatchForCourt = createGetLatestMatchForCourtUseCase(
    courtRepository,
    matchRepository,
  );
  const getCourtSetup = createGetCourtSetupUseCase(courtRepository, matchRepository);
  const getSystemHealth = createGetSystemHealthUseCase(healthRepository);
  const seedInitialCourt = createSeedInitialCourtUseCase(courtRepository);

  const courtsController = createCourtsController({
    getCourtById,
    getLatestMatchForCourt,
    getCourtSetup,
  });
  const healthController = createHealthController(getSystemHealth);

  app.use(cors());
  app.use(express.json());
  app.use("/api/health", createHealthRouter(healthController));
  app.use("/api/courts", createCourtsRouter(courtsController));

  app.use((error, _request, response, _next) => {
    console.error("API request failed:", error);
    const statusCode = error instanceof ApplicationError ? error.statusCode : 500;
    const message =
      error instanceof ApplicationError
        ? error.message
        : "An unexpected server error occurred.";

    response.status(statusCode).json({error: message});
  });

  return {
    app,
    async initialize() {
      await connectDatabase();
      await seedInitialCourt();
    },
  };
}
