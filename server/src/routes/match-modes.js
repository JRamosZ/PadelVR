import {Router} from "express";

export function createMatchModesRouter(controller) {
  const router = Router();

  router.get("/", controller);

  return router;
}
