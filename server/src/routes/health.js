import {Router} from "express";

export function createHealthRouter(controller) {
  const router = Router();

  router.get("/", controller);

  return router;
}
