import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import helmet from "helmet";
import corsMiddleware from "./middlewares/cors-middleware.js";
import csrfOriginGuard from "./middlewares/csrf-origin-middleware.js";
import errorMiddleware from "./middlewares/error-middleware.js";
import morganMiddleware from "./middlewares/morgan-middleware.js";
import notFoundMiddleware from "./middlewares/not-found-middleware.js";
import { adminRouter } from "./routes/admin.route.js";
import { appointmentRouter } from "./routes/appointment.route.js";
import { assessmentRouter } from "./routes/assessment.route.js";
import { authRouter } from "./routes/auth.route.js";
import { carePlanRouter } from "./routes/care-plan.route.js";
import { doctorRouter } from "./routes/doctor.route.js";
import { donorRouter } from "./routes/donor.route.js";
import { donorRequestRouter } from "./routes/donor-request.route.js";
import { emergencyRouter } from "./routes/emergency.route.js";
import { facilityRouter } from "./routes/facility.route.js";
import { healthRouter } from "./routes/health.route.js";
import { notificationRouter } from "./routes/notification.route.js";
import { patientRouter } from "./routes/patient.route.js";
import { secondOpinionRouter } from "./routes/second-opinion.route.js";
import ApiResponse from "./utils/api-response.js";

const app: Express = express();

app.disable("x-powered-by");
// Needed for correct client IPs (rate limiting, audit logs) behind a proxy
// such as Render/Railway/Vercel. Adjust the hop count to your host.
app.set("trust proxy", 1);

app.use(helmet());
app.use(corsMiddleware);
app.use(morganMiddleware);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.status(200).json(new ApiResponse(200, "Magadh Ventures API is running"));
});

app.use("/health", healthRouter);

// --- API v1 ---------------------------------------------------------------
app.use("/api/v1", csrfOriginGuard);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/patients", patientRouter);
app.use("/api/v1/doctors", doctorRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/assessments", assessmentRouter);
app.use("/api/v1/second-opinions", secondOpinionRouter);
app.use("/api/v1/care-plans", carePlanRouter);
app.use("/api/v1/appointments", appointmentRouter);
app.use("/api/v1/donors", donorRouter);
app.use("/api/v1/donor-requests", donorRequestRouter);
app.use("/api/v1/emergencies", emergencyRouter);
app.use("/api/v1/facilities", facilityRouter);
app.use("/api/v1/notifications", notificationRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
