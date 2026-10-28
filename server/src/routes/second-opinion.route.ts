import { Router, type Router as ExpressRouter } from "express";
import * as secondOpinionController from "../controllers/second-opinion.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import requireVerifiedDoctor from "../middlewares/require-verified-doctor.js";

const router: ExpressRouter = Router();

router.use(authenticate);
router.get("/", authorize("patient", "doctor"), secondOpinionController.list);
router.post("/:id/claim", authorize("doctor"), requireVerifiedDoctor, secondOpinionController.claim);

export { router as secondOpinionRouter };
