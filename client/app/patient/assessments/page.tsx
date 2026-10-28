"use client";

import Link from "next/link";
import { ArrowRight, ClipboardPlus } from "lucide-react";
import { EmptyState, ErrorState, CardSkeleton } from "@/components/common/states";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { buttonVariants } from "@/components/ui/button";
import { AssessmentForm } from "@/features/clinical/assessment-form";
import { ClinicalDisclaimer, PriorityBadge, SectionCard } from "@/features/clinical/clinical-ui";
import { useAssessments } from "@/features/clinical/hooks";
import { usePatientProfile } from "@/features/patients/hooks";
import { formatDateTime } from "@/lib/format";
import type { PatientAssessmentSummary } from "@/types/api";
import { cn } from "cn";
import { useState } from "react";

const isPatientSummary = (item: object): item is PatientAssessmentSummary => "reviewCount" in item;

export default function PatientAssessmentsPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useAssessments({ page, limit: 20 });
  const { data: profileData, isPending: profilePending, isError: profileError } = usePatientProfile();
  const items = data?.items.filter(isPatientSummary) ?? [];
  const aiConsent = profileData?.profile.consents.some((consent) => consent.type === "ai_assessment" && consent.granted) ?? false;

  return (
    <div className="space-y-6">
      <PageHeader title="My assessments" description="Share symptoms for a doctor to review and follow the progress here." />
      <SectionCard title="Start a symptom assessment" description="This prototype provides informational support and does not replace professional medical care.">
        {!aiConsent ? (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">{profilePending ? "Checking your consent settings…" : profileError ? "We couldn't check your consent settings." : "AI-assisted assessment consent is required."}</p>
            <p className="mt-1">Review and enable AI-assisted assessments in your health profile before submitting symptoms.</p>
            <Link href="/patient/profile" className="mt-2 inline-flex font-medium underline underline-offset-4">Open health profile</Link>
          </div>
        ) : null}
        <AssessmentForm disabled={profilePending || profileError || !aiConsent} />
      </SectionCard>
      <SectionCard title="Assessment history" description="Your submitted cases, ordered newest first.">
        {isPending ? <CardSkeleton lines={4} /> : isError ? <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load assessments" /> : items.length === 0 ? (
          <EmptyState title="No assessments yet" description="When you submit symptoms, your case will appear here." action={<ClipboardPlus className="size-5 text-muted-foreground" aria-hidden />} />
        ) : (
          <div className="divide-y">
            {items.map((assessment) => (
              <article key={assessment.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{assessment.symptoms.map((symptom) => symptom.name).join(", ")}</h3>
                    <PriorityBadge priority={assessment.priority} />
                  </div>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">{assessment.status.replaceAll("_", " ")} · submitted {formatDateTime(assessment.createdAt)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">AI: {assessment.aiStatus.replaceAll("_", " ")}{assessment.aiMode === "demo" ? " (simulated demo output)" : ""} · {assessment.reviewCount} doctor review{assessment.reviewCount === 1 ? "" : "s"}</p>
                </div>
                <Link href={`/patient/assessments/${assessment.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  View details <ArrowRight data-icon="inline-end" />
                </Link>
              </article>
            ))}
          </div>
        )}
        {data ? <Pagination pagination={data.pagination} onPageChange={setPage} disabled={isPending} /> : null}
      </SectionCard>
      <ClinicalDisclaimer />
    </div>
  );
}
