import cors from "cors";
import express from "express";
import {ApplicationError} from "./domain/errors/application.error.js";
import {connectDatabase} from "./infrastructure/mongoose/connect-database.js";
import {createCourtRepository} from "./infrastructure/mongoose/repositories/court.repository.js";
import {createHealthRepository} from "./infrastructure/mongoose/repositories/health.repository.js";
import {createMatchRepository} from "./infrastructure/mongoose/repositories/match.repository.js";
import {createCourtsController} from "./interfaces/http/controllers/courts.controller.js";
import {createHealthController} from "./interfaces/http/controllers/health.controller.js";
import {createMatchModesController} from "./interfaces/http/controllers/match-modes.controller.js";
import {createCourtsRouter} from "./routes/courts.js";
import {createHealthRouter} from "./routes/health.js";
import {createMatchModesRouter} from "./routes/match-modes.js";
import {createGetCourtByIdUseCase} from "./usecases/courts/get-court-by-id.use-case.js";
import {createGetCourtSetupUseCase} from "./usecases/courts/get-court-setup.use-case.js";
import {createGetLatestMatchForCourtUseCase} from "./usecases/courts/get-latest-match-for-court.use-case.js";
import {createSeedInitialCourtUseCase} from "./usecases/courts/seed-initial-court.use-case.js";
import {createCreateMatchUseCase} from "./usecases/courts/create-match.use-case.js";
import {createGetSystemHealthUseCase} from "./usecases/health/get-system-health.use-case.js";
import matchModes from "./config/matchModes.js";
import {createGetMatchModesUseCase} from "./usecases/match-modes/get-match-modes.use-case.js";

export function createApplication() {
  const app = express();
  const courtRepository = createCourtRepository();
  const matchRepository = createMatchRepository();
  const healthRepository = createHealthRepository();

  const getCourtById = createGetCourtByIdUseCase(courtRepository);
  const getLatestMatchForCourt = createGetLatestMatchForCourtUseCase(courtRepository, matchRepository);
  const getCourtSetup = createGetCourtSetupUseCase(courtRepository, matchRepository);
  const getSystemHealth = createGetSystemHealthUseCase(healthRepository);
  const seedInitialCourt = createSeedInitialCourtUseCase(courtRepository);
  const getMatchModes = createGetMatchModesUseCase(matchModes);
  const createMatch = createCreateMatchUseCase({courtRepository, matchRepository, matchModes});

  const courtsController = createCourtsController({
    getCourtById,
    getLatestMatchForCourt,
    getCourtSetup,
    createMatch,
  });
  const healthController = createHealthController(getSystemHealth);
  const matchModesController = createMatchModesController(getMatchModes);

  app.use(cors());
  app.use(express.json({limit: "6mb"}));
  app.use("/api/health", createHealthRouter(healthController));
  app.use("/api/courts", createCourtsRouter(courtsController));
  app.use("/api/match-modes", createMatchModesRouter(matchModesController));

  app.use((error, _request, response, _next) => {
    console.error("API request failed:", error);
    const statusCode = error instanceof ApplicationError ? error.statusCode : 500;
    const message = error instanceof ApplicationError ? error.message : "An unexpected server error occurred.";

    response.status(statusCode).json({
      error: message,
      ...(error instanceof ApplicationError ? error.details : {}),
    });
  });

  return {
    app,
    async initialize() {
      await connectDatabase();
      await seedInitialCourt();
    },
  };
}
