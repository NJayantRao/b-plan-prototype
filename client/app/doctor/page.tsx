"use client";

import { ArrowRight, Check, Circle, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { CardSkeleton, ErrorState } from "@/components/common/states";
import { VerificationBadge } from "@/components/common/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { useDoctorProfile } from "@/features/doctors/hooks";
import { formatDate } from "@/lib/format";
import type { DoctorProfile } from "@/types/api";
import { cn } from "cn";

const BANNER = {
  verified: {
    icon: ShieldCheck,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    title: "Your credentials are verified",
    text: "Your assessment queue and clinical workspace are ready.",
  },
  pending: {
    icon: ShieldQuestion,
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    title: "Awaiting administrator verification",
    text: "Clinical features unlock once an administrator verifies your licence. Make sure your profile is complete.",
  },
  rejected: {
    icon: ShieldAlert,
    tone: "border-red-200 bg-red-50 text-red-900",
    title: "Verification was not approved",
    text: "Review the note below, update your credentials, and an administrator can look again.",
  },
} as const;

function VerificationCard({ profile }: { profile: DoctorProfile }) {
  const banner = BANNER[profile.verificationStatus];
  const Icon = banner.icon;
  return (
    <div className={cn("flex gap-4 rounded-xl border p-5", banner.tone)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold">{banner.title}</p>
        <p className="mt-1 text-sm opacity-90">{banner.text}</p>
        {profile.verification ? (
          <p className="mt-3 text-sm">
            <span className="font-medium">Reviewed {formatDate(profile.verification.reviewedAt)}</span>
            {profile.verification.notes ? <>: {profile.verification.notes}</> : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function DoctorOverviewPage() {
  const { user } = useAuth();
  const { data: profile, isPending, isError, error, refetch } = useDoctorProfile();

  const checklist = profile
    ? [
        { id: "licence", label: "Medical licence number", done: Boolean(profile.licenseNumber) },
        { id: "spec", label: "At least one specialty", done: profile.specialties.length > 0 },
        { id: "qual", label: "At least one qualification", done: profile.qualifications.length > 0 },
      ]
    : [];

  return (
    <>
      <PageHeader
        title={`Welcome, Dr. ${user?.lastName ?? ""}`}
        description="Your account, verification status, and clinical work."
        actions={profile ? <VerificationBadge status={profile.verificationStatus} /> : null}
      />

      {isPending ? (
        <div className="space-y-6">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={3} />
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your profile" />
      ) : (
        <div className="space-y-6">
          <VerificationCard profile={profile} />
          {profile.verificationStatus === "verified" ? (
            <section className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Clinical workspace</h2>
                <p className="mt-1 text-sm text-muted-foreground">Review assessments, manage second opinions, and create patient care plans.</p>
              </div>
              <Link href="/doctor/assessments" className={buttonVariants({ size: "lg" })}>Open review queue</Link>
            </section>
          ) : null}

          <section className="rounded-xl border bg-card">
            <div className="border-b px-5 py-4">
              <h2 className="text-[15px] font-semibold">Profile checklist</h2>
            </div>
            <div className="p-5">
              <ul className="space-y-3">
                {checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 text-sm">
                    {item.done ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="size-3" aria-hidden />
                      </span>
                    ) : (
                      <Circle className="size-5 text-muted-foreground/50" aria-hidden />
                    )}
                    <span className={item.done ? "" : "text-muted-foreground"}>{item.label}</span>
                    <span className="sr-only">{item.done ? "completed" : "not completed"}</span>
                  </li>
                ))}
              </ul>
              <Link href="/doctor/profile" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-9")}>
                Edit profile & credentials
                <ArrowRight data-icon="inline-end" />
              </Link>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
