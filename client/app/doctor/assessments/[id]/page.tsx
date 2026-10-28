import { DoctorAssessmentDetail } from "@/features/clinical/doctor-assessment-detail";

export default async function DoctorAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DoctorAssessmentDetail id={id} />;
}
