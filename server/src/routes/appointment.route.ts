import { Router, type Router as ExpressRouter } from "express";
import * as appointmentController from "../controllers/appointment.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";

const router: ExpressRouter = Router();
router.use(authenticate);
router.post("/", authorize("patient"), appointmentController.create);
router.get("/", authorize("patient", "doctor"), appointmentController.list);
router.patch("/:id/status", authorize("patient", "doctor"), appointmentController.updateStatus);

export { router as appointmentRouter };
