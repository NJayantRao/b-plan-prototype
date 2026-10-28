import { PatientAssessmentDetail } from "@/features/clinical/patient-assessment-detail";

export default async function PatientAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PatientAssessmentDetail id={id} />;
}
