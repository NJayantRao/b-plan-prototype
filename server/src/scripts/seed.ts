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
import { DoctorProfile } from "../models/doctor-profile.model.js";
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
