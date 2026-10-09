import {Router} from "express";

export function createCourtsRouter(controller) {
  const router = Router();

  router.get("/:courtId/setup", controller.getSetup);
  router.get("/:courtId/matches/latest", controller.getLatestMatch);
  router.post("/:courtId/matches", controller.createMatch);
  router.get("/:courtId", controller.getCourt);

  return router;
}
