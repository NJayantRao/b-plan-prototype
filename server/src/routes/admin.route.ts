import { Router, type Router as ExpressRouter } from "express";
import * as adminController from "../controllers/admin.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";

const router: ExpressRouter = Router();

router.use(authenticate, authorize("admin"));

router.get("/doctors", adminController.listDoctors);
router.patch("/doctors/:id/verification", adminController.setDoctorVerification);
router.get("/audit-logs", adminController.listAuditLogs);

export { router as adminRouter };
