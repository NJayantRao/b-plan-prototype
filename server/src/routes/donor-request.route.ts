import { Router, type Router as ExpressRouter } from "express";
import * as donorController from "../controllers/donor.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";

const router: ExpressRouter = Router();
router.use(authenticate, authorize("patient"));
router.post("/", donorController.createRequest);
router.get("/", donorController.listRequests);
router.patch("/:id/status", donorController.updateRequest);

export { router as donorRequestRouter };
