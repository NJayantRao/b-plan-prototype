import { Router, type Router as ExpressRouter } from "express";
import * as notificationController from "../controllers/notification.controller.js";
import authenticate from "../middlewares/authenticate.js";

const router: ExpressRouter = Router();
router.use(authenticate);
router.get("/", notificationController.list);
router.patch("/:id/read", notificationController.markRead);

export { router as notificationRouter };
