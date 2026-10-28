import { loadCoreOverviewCounts } from "../repository/admin-overview.repository.js";
import { getCounts as getDonorCounts } from "./donor.service.js";
import { getCounts as getEmergencyCounts } from "./emergency.service.js";
import { getCounts as getFacilityCounts } from "./facility.service.js";
import { countAuthorizedResponders } from "../repository/responder.repository.js";

export const getOverview = async () => {
  const [
    core,
    donorCounts,
    emergencyCounts,
    facilityCounts,
    authorizedResponders,
  ] = await Promise.all([
    loadCoreOverviewCounts(),
    getDonorCounts(),
    getEmergencyCounts(),
    getFacilityCounts(),
    countAuthorizedResponders(),
  ]);
  return {
    prototype: true,
    users: { total: core.totalUsers, patients: core.patients, doctors: core.doctors },
    doctors: { total: core.doctors, verified: core.verifiedDoctors, pendingVerification: core.pendingDoctors },
    assessments: { total: core.assessments, awaitingReview: core.awaitingReview },
    carePlans: { active: core.activeCarePlans },
    appointments: { total: core.appointments, upcoming: core.upcomingAppointments },
    donors: donorCounts,
    emergencies: emergencyCounts,
    facilities: facilityCounts,
    authorizedResponders,
    notice: "Analytics include synthetic prototype activity and are not operational healthcare metrics.",
  };
};
