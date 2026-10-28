import { Router, type Router as ExpressRouter } from "express";
import * as doctorController from "../controllers/doctor.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";

const router: ExpressRouter = Router();

router.get("/", authenticate, authorize("patient"), doctorController.listDirectory);
router.get("/:id/availability", authenticate, authorize("patient"), doctorController.getAvailability);
router.get("/:id", authenticate, authorize("patient"), doctorController.getPublicProfile);
router.use(authenticate, authorize("doctor"));

// Unverified doctors can manage their profile (that is how they get verified)
// but are blocked from clinical routes by `requireVerifiedDoctor` in Phase 3.
router.get("/me", doctorController.getMyProfile);
router.patch("/me", doctorController.updateMyProfile);

export { router as doctorRouter };
