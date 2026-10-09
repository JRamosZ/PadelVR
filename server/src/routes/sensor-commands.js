import {Router} from "express";

export function createSensorCommandsRouter(controller) {
  const router = Router();
  router.post("/", controller.record);
  return router;
}
