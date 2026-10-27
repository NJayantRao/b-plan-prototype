"use client";

import { PageHeader } from "@/components/common/page-header";
import { CardSkeleton, ErrorState } from "@/components/common/states";
import { usePatientProfile } from "@/features/patients/hooks";
import { PatientProfileForm } from "@/features/patients/profile-form";

export default function PatientProfilePage() {
  const { data, isPending, isError, error, refetch } = usePatientProfile();

  return (
    <>
      <PageHeader
        title="My health profile"
        description="This information gives doctors the context they need to review your assessments. Only you and clinicians authorised to review your case can see it."
      />
      {isPending ? (
        <div className="space-y-6">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={4} />
          <CardSkeleton lines={3} />
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your profile" />
      ) : (
        <PatientProfileForm profile={data.profile} />
      )}
    </>
  );
}
