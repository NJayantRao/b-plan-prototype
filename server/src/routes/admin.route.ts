import { Router, type Router as ExpressRouter } from "express";
import * as adminController from "../controllers/admin.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";

const router: ExpressRouter = Router();

router.use(authenticate, authorize("admin"));

router.get("/overview", adminController.getOverview);
router.get("/doctors", adminController.listDoctors);
router.patch("/doctors/:id/verification", adminController.setDoctorVerification);
router.patch("/facilities/:id/verification", adminController.verifyFacility);
router.patch("/responders/:id/authorization", adminController.authorizeResponder);
router.get("/audit-logs", adminController.listAuditLogs);

export { router as adminRouter };
