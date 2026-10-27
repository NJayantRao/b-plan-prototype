import { Router, type Router as ExpressRouter } from "express";
import * as patientController from "../controllers/patient.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";

const router: ExpressRouter = Router();

router.use(authenticate);

// `/me` must be declared before `/:id`.
router.get("/me", authorize("patient"), patientController.getMyProfile);
router.patch("/me", authorize("patient"), patientController.updateMyProfile);

// Role gate only lets plausible actors in; record-level access is enforced
// in the service (self / audited admin / doctor relationship in Phase 3).
router.get("/:id", authorize("patient", "doctor", "admin"), patientController.getPatientById);

export { router as patientRouter };
