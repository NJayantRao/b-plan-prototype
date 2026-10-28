import { Router, type Router as ExpressRouter } from "express";
import * as assessmentController from "../controllers/assessment.controller.js";
import * as secondOpinionController from "../controllers/second-opinion.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import { aiLimiter } from "../middlewares/rate-limit-middleware.js";
import requireVerifiedDoctor from "../middlewares/require-verified-doctor.js";

const router: ExpressRouter = Router();

// Admins are intentionally excluded from every clinical route (least privilege).
router.use(authenticate);

router.post("/", authorize("patient"), aiLimiter, assessmentController.create);
router.get("/", authorize("patient", "doctor"), assessmentController.list);
router.get("/:id", authorize("patient", "doctor"), assessmentController.getOne);

router.post("/:id/claim", authorize("doctor"), requireVerifiedDoctor, assessmentController.claim);
router.post("/:id/retry-ai", authorize("patient"), aiLimiter, assessmentController.retryAi);

router.post("/:id/reviews", authorize("doctor"), requireVerifiedDoctor, assessmentController.submitReview);
router.patch("/:id/reviews/:reviewId", authorize("doctor"), requireVerifiedDoctor, assessmentController.amendReview);

router.post("/:id/second-opinions", authorize("patient", "doctor"), secondOpinionController.request);

export { router as assessmentRouter };
