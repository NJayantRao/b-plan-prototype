import { Router, type Router as ExpressRouter } from "express";
import * as donorController from "../controllers/donor.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";

const router: ExpressRouter = Router();
router.use(authenticate);
router.get("/me", authorize("patient"), donorController.getMyProfile);
router.put("/me", authorize("patient"), donorController.register);
router.get("/search", authorize("patient"), donorController.search);

export { router as donorRouter };
