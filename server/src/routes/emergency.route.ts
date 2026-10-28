import { Router, type Router as ExpressRouter } from "express";
import * as emergencyController from "../controllers/emergency.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";

const router: ExpressRouter = Router();
router.use(authenticate);
router.post("/", authorize("patient"), emergencyController.create);
router.get("/", authorize("patient", "responder"), emergencyController.list);
router.get("/:id", authorize("patient", "responder"), emergencyController.getOne);
router.post("/:id/claim", authorize("responder"), emergencyController.claim);
router.patch("/:id/status", authorize("responder"), emergencyController.updateStatus);
router.post("/:id/cancel", authorize("patient"), emergencyController.cancel);

export { router as emergencyRouter };
