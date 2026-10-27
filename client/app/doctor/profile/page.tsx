"use client";

import { PageHeader } from "@/components/common/page-header";
import { CardSkeleton, ErrorState } from "@/components/common/states";
import { VerificationBadge } from "@/components/common/status-badge";
import { useDoctorProfile } from "@/features/doctors/hooks";
import { DoctorProfileForm } from "@/features/doctors/profile-form";

export default function DoctorProfilePage() {
  const { data, isPending, isError, error, refetch } = useDoctorProfile();

  return (
    <>
      <PageHeader
        title="Profile & credentials"
        description="Keep your credentials accurate. An administrator verifies your licence before you can review patients."
        actions={data ? <VerificationBadge status={data.verificationStatus} /> : null}
      />
      {isPending ? (
        <div className="space-y-6">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={4} />
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your profile" />
      ) : (
        <DoctorProfileForm profile={data} />
      )}
    </>
  );
}
