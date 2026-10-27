import { Router, type Router as ExpressRouter } from "express";
import { healthController } from "../controllers/health.controller.js";

const router: ExpressRouter = Router();

router.get("/", healthController);

export { router as healthRouter };
