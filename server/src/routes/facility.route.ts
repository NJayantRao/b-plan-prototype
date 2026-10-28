import { Router, type Router as ExpressRouter } from "express";
import * as facilityController from "../controllers/facility.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";

const router: ExpressRouter = Router();
router.use(authenticate);
router.get("/", authorize("patient", "doctor", "partner", "admin"), facilityController.list);
router.post("/", authorize("partner"), facilityController.create);

export { router as facilityRouter };
