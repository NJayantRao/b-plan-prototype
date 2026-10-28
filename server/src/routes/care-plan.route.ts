import { Router, type Router as ExpressRouter } from "express";
import * as carePlanController from "../controllers/care-plan.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import requireVerifiedDoctor from "../middlewares/require-verified-doctor.js";

const router: ExpressRouter = Router();

router.use(authenticate);
router.post("/", authorize("doctor"), requireVerifiedDoctor, carePlanController.create);
router.get("/", authorize("patient", "doctor"), carePlanController.list);
router.get("/:id", authorize("patient", "doctor"), carePlanController.getOne);
router.patch("/:id/tasks/:taskId", authorize("patient", "doctor"), carePlanController.updateTask);

export { router as carePlanRouter };
