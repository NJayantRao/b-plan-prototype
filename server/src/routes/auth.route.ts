import { Router, type Router as ExpressRouter } from "express";
import * as authController from "../controllers/auth.controller.js";
import authenticate from "../middlewares/authenticate.js";
import { authLimiter, signupLimiter } from "../middlewares/rate-limit-middleware.js";

const router: ExpressRouter = Router();

router.post("/sign-up", signupLimiter, authController.register);
router.post("/send-otp", signupLimiter, authController.sendOtp);
router.post("/verify-otp", signupLimiter, authController.verifyOtp);
router.post("/sign-in", authLimiter, authController.login);
router.post("/refresh-token", authLimiter, authController.refreshToken);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);

export { router as authRouter };
