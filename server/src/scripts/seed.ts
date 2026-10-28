/**
 * Demo seed script. Creates synthetic accounts for local demos.
 * Safe to re-run: accounts are upserted by email and existing passwords are
 * never overwritten. Refuses to run against production.
 */
import mongoose from "mongoose";
import connectToDB, { disconnectFromDB } from "../config/db.js";
import { ENV } from "../config/env.js";
import logger from "../config/logger.js";
import type { Role } from "../constants/roles.js";
import { CONSENT_VERSION } from "../constants/roles.js";
import { PRIORITY_RANK, type Priority } from "../constants/clinical.js";
import { Assessment } from "../models/assessment.model.js";
import { AssessmentReview } from "../models/assessment-review.model.js";
import { CarePlan } from "../models/care-plan.model.js";
import { DoctorProfile } from "../models/doctor-profile.model.js";
import { DemoProvider } from "../services/ai/demo.provider.js";
import { runAiAssessment } from "../services/ai/ai-assessment.service.js";
import { evaluateRedFlags } from "../services/safety.service.js";
import { PatientProfile } from "../models/patient-profile.model.js";
import { User } from "../models/user.model.js";
import { hashPassword } from "../utils/bcrypt.js";

if (ENV.isProduction) {
  console.error("❌ Refusing to seed demo data: NODE_ENV is production.");
  process.exit(1);
}

const DEMO_PASSWORD = process.env["SEED_PASSWORD"] ?? "Demo@12345";
const DOMAIN = "demo.magadh.test";

interface DemoUser {
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

const demoUsers: DemoUser[] = [
  { firstName: "Aarav", lastName: "Sharma", email: `patient@${DOMAIN}`, role: "patient" },
  { firstName: "Meera", lastName: "Iyer", email: `doctor@${DOMAIN}`, role: "doctor" },
  { firstName: "Rohan", lastName: "Das", email: `doctor.pending@${DOMAIN}`, role: "doctor" },
  { firstName: "Admin", lastName: "Demo", email: `admin@${DOMAIN}`, role: "admin" },
  { firstName: "Priya", lastName: "Nair", email: `partner@${DOMAIN}`, role: "partner" },
  { firstName: "Karan", lastName: "Singh", email: `responder@${DOMAIN}`, role: "responder" },
];

const upsertUser = async (demo: DemoUser, passwordHash: string) => {
  await User.updateOne(
    { email: demo.email },
    {
      $set: {
        firstName: demo.firstName,
        lastName: demo.lastName,
        role: demo.role,
        status: "active",
        emailVerified: true,
      },
      // Never reset a password that already exists.
      $setOnInsert: { email: demo.email, passwordHash },
    },
    { upsert: true, runValidators: true },
  );
  const user = await User.findOne({ email: demo.email }).select("_id").lean();
  if (!user) throw new Error(`Failed to upsert ${demo.email}`);
  return user;
};


const DAY = 24 * 60 * 60 * 1000;
const dayStart = (offsetDays: number) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

/** Synthetic assessments in different states. Only created if the patient has none. */
const seedAssessments = async (
  patientId: mongoose.Types.ObjectId,
  doctorId: mongoose.Types.ObjectId,
) => {
  if ((await Assessment.countDocuments({ patientId })) > 0) return;

  const snapshot = {
    ageYears: 28,
    gender: "male" as const,
    allergies: ["Penicillin"],
    currentMedications: ["Cetirizine"],
    conditions: ["Seasonal allergic rhinitis"],
  };

  const build = async (
    symptoms: {
      name: string;
      severity: "mild" | "moderate" | "severe";
      duration: { value: number; unit: "hours" | "days" | "weeks" | "months" };
    }[],
    description: string,
  ) => {
    const redFlags = evaluateRedFlags({ symptoms, description, ageYears: snapshot.ageYears });
    const priority: Priority =
      redFlags.level === "emergency" ? "emergency" : redFlags.level === "urgent" ? "urgent" : "routine";
    // The demo provider is deterministic and labelled mode "demo" everywhere.
    const run = await runAiAssessment(
      { symptoms, description, patient: snapshot },
      new DemoProvider(),
    );
    if (run.status !== "completed") throw new Error("Demo AI unexpectedly unavailable");
    return {
      patientId,
      symptoms,
      description,
      profileSnapshot: snapshot,
      redFlags,
      priority,
      priorityRank: PRIORITY_RANK[priority],
      ai: {
        status: "completed" as const,
        mode: run.mode,
        model: run.model,
        generatedAt: run.generatedAt,
        attempts: 1,
        result: { ...run.result },
      },
    };
  };

  // 1. Fully reviewed case with a care plan (one task overdue, one done).
  const reviewed = await Assessment.create({
    ...(await build(
      [
        { name: "Sore throat", severity: "moderate", duration: { value: 2, unit: "days" } },
        { name: "Cough", severity: "mild", duration: { value: 3, unit: "days" } },
      ],
      "Scratchy throat and dry cough since the weekend. No breathing difficulty.",
    )),
    status: "reviewed",
    assignedDoctorId: doctorId,
    claimedAt: new Date(Date.now() - 2 * DAY),
  });
  await AssessmentReview.create({
    assessmentId: reviewed._id,
    doctorId,
    kind: "primary",
    findings: {
      impression: "Findings are consistent with a viral upper respiratory infection.",
      possibleConditions: ["Viral upper respiratory infection"],
      recommendedTests: [],
      urgency: "routine",
      advice: "Rest, fluids, and review if symptoms last beyond a week or breathing becomes difficult.",
    },
    aiComparison: { agreement: "agree" },
    submittedAt: new Date(Date.now() - DAY),
  });
  await CarePlan.create({
    patientId,
    doctorId,
    assessmentId: reviewed._id,
    title: "Recovery plan: upper respiratory infection",
    summary: "Self-care with a follow-up check. Demo data.",
    tasks: [
      { title: "Rest and drink plenty of fluids", type: "lifestyle", status: "completed", completedAt: new Date(), dueDate: dayStart(-3) },
      { title: "Monitor temperature twice a day", type: "follow_up", status: "pending", dueDate: dayStart(-1) },
      { title: "Follow-up check-in with the doctor", type: "follow_up", status: "pending", dueDate: dayStart(4) },
    ],
    referrals: [],
    followUpDate: dayStart(4),
  });

  // 2. Routine case waiting in the doctor queue.
  await Assessment.create({
    ...(await build(
      [
        { name: "Headache", severity: "moderate", duration: { value: 1, unit: "days" } },
        { name: "Nausea", severity: "mild", duration: { value: 12, unit: "hours" } },
      ],
      "Dull headache since yesterday, worse in the evening.",
    )),
    status: "awaiting_review",
  });

  // 3. Urgent-priority case (persistent fever) in the queue.
  await Assessment.create({
    ...(await build(
      [{ name: "Fever", severity: "severe", duration: { value: 4, unit: "days" } }],
      "High fever for four days with body aches.",
    )),
    status: "awaiting_review",
  });
};

const run = async () => {
  await connectToDB();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const ids = new Map<string, mongoose.Types.ObjectId>();
  for (const demo of demoUsers) {
    const user = await upsertUser(demo, passwordHash);
    ids.set(demo.email, user._id);
  }

  const patientId = ids.get(`patient@${DOMAIN}`)!;
  await PatientProfile.findOneAndUpdate(
    { userId: patientId },
    {
      $set: {
        dateOfBirth: new Date("1998-04-12T00:00:00.000Z"),
        gender: "male",
        location: { city: "Patna", state: "Bihar", country: "IN", pincode: "800001" },
        allergies: ["Penicillin"],
        currentMedications: [{ name: "Cetirizine", dosage: "10 mg", frequency: "As needed" }],
        medicalHistory: [{ condition: "Seasonal allergic rhinitis", diagnosedYear: 2019 }],
        consents: [
          { type: "data_processing", granted: true, version: CONSENT_VERSION, updatedAt: new Date() },
          { type: "ai_assessment", granted: true, version: CONSENT_VERSION, updatedAt: new Date() },
        ],
      },
    },
    { upsert: true, runValidators: true },
  );

  // Verified demo doctor. The licence number is synthetic.
  const verifiedDoctor = ids.get(`doctor@${DOMAIN}`)!;
  const adminId = ids.get(`admin@${DOMAIN}`)!;
  await DoctorProfile.findOneAndUpdate(
    { userId: verifiedDoctor },
    {
      $set: {
        specialties: ["General Medicine"],
        qualifications: [{ degree: "MBBS", institution: "Demo Medical College", year: 2012 }],
        licenseNumber: "DEMO-LIC-0001",
        registrationCouncil: "Demo Medical Council",
        yearsOfExperience: 12,
        bio: "Synthetic demo doctor for the Magadh Ventures prototype.",
        consultationFee: 500,
        verificationStatus: "verified",
        verification: { reviewedBy: adminId, reviewedAt: new Date(), notes: "Seeded demo verification" },
      },
    },
    { upsert: true, runValidators: true },
  );

  // Pending demo doctor: lets you demo the admin verification workflow.
  const pendingDoctor = ids.get(`doctor.pending@${DOMAIN}`)!;
  await DoctorProfile.findOneAndUpdate(
    { userId: pendingDoctor },
    {
      $set: {
        specialties: ["Cardiology"],
        qualifications: [{ degree: "MD (Medicine)", institution: "Demo Medical College", year: 2016 }],
        licenseNumber: "DEMO-LIC-0002",
        registrationCouncil: "Demo Medical Council",
        yearsOfExperience: 7,
        verificationStatus: "pending",
      },
      $unset: { verification: "" },
    },
    { upsert: true, runValidators: true },
  );

  await seedAssessments(patientId, verifiedDoctor);

  console.log("\n✅ Demo data seeded (synthetic, development only)\n");
  console.log(`Password for every account: ${DEMO_PASSWORD}  (existing accounts keep their current password)\n`);
  for (const demo of demoUsers) {
    console.log(`  ${demo.role.padEnd(10)} ${demo.email}`);
  }
  console.log("");
};

run()
  .catch((error: unknown) => {
    logger.error(`Seed failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDB());
