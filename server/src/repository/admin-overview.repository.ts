import { User } from "../models/user.model.js";
import { Assessment } from "../models/assessment.model.js";
import { CarePlan } from "../models/care-plan.model.js";
import { DoctorProfile } from "../models/doctor-profile.model.js";
import { PatientProfile } from "../models/patient-profile.model.js";
import { Appointment } from "../models/appointment.model.js";

export const loadCoreOverviewCounts = async () => {
  const [
    totalUsers,
    patients,
    doctors,
    verifiedDoctors,
    pendingDoctors,
    assessments,
    awaitingReview,
    activeCarePlans,
    appointments,
    upcomingAppointments,
  ] = await Promise.all([
    User.countDocuments().exec(),
    PatientProfile.countDocuments().exec(),
    DoctorProfile.countDocuments().exec(),
    DoctorProfile.countDocuments({ verificationStatus: "verified" }).exec(),
    DoctorProfile.countDocuments({ verificationStatus: "pending" }).exec(),
    Assessment.countDocuments().exec(),
    Assessment.countDocuments({ status: "awaiting_review" }).exec(),
    CarePlan.countDocuments({ progressStatus: "active" }).exec(),
    Appointment.countDocuments().exec(),
    Appointment.countDocuments({
      scheduledAt: { $gte: new Date() },
      status: { $in: ["requested", "confirmed"] },
    }).exec(),
  ]);
  return {
    totalUsers,
    patients,
    doctors,
    verifiedDoctors,
    pendingDoctors,
    assessments,
    awaitingReview,
    activeCarePlans,
    appointments,
    upcomingAppointments,
  };
};
