"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardSkeleton, ErrorState } from "@/components/common/states";
import { PageHeader } from "@/components/common/page-header";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/components/ui/toast";
import type { PatientAssessment } from "@/types/api";
import { ClinicalDisclaimer, PriorityBadge, SafetyNotice, SectionCard } from "./clinical-ui";
import { useAssessment, useRequestSecondOpinion, useRetryAssessmentAi } from "./hooks";

export function PatientAssessmentDetail({ id }: { id: string }) {
  const { data, isPending, isError, error, refetch } = useAssessment(id);
  const retry = useRetryAssessmentAi();
  const request = useRequestSecondOpinion();
  const [reason, setReason] = useState("");

  if (isPending) return <CardSkeleton lines={5} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load this assessment" />;
  if (!data || "role" in data) return <ErrorState error={new Error("This assessment is not available in the patient view.")} />;

  const assessment: PatientAssessment = data;
  const ai = assessment.ai.result;

  const handleRetry = async () => {
    try {
      await retry.mutateAsync(assessment.id);
      toast.add({ type: "success", title: "AI assessment updated" });
    } catch (retryError) {
      toast.add({ type: "error", title: "Couldn't retry AI assessment", description: getErrorMessage(retryError) });
    }
  };

  const handleSecondOpinion = async () => {
    try {
      await request.mutateAsync({ id: assessment.id, ...(reason.trim() ? { reason: reason.trim() } : {}) });
      toast.add({ type: "success", title: "Second opinion requested" });
    } catch (requestError) {
      toast.add({ type: "error", title: "Couldn't request a second opinion", description: getErrorMessage(requestError) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment details"
        description={`Submitted ${formatDateTime(assessment.createdAt)} · ${assessment.symptoms.map((symptom) => symptom.name).join(", ")}`}
        actions={<PriorityBadge priority={assessment.priority} />}
      />

      {assessment.safety.level !== "none" ? <SafetyNotice safety={assessment.safety} /> : null}

      <SectionCard title="Your symptoms" description={assessment.description ?? undefined}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {assessment.symptoms.map((symptom) => (
            <li key={symptom.name} className="rounded-lg border p-3">
              <p className="font-medium">{symptom.name}</p>
              <p className="mt-1 text-sm capitalize text-muted-foreground">{symptom.severity} · {symptom.duration.value} {symptom.duration.unit}</p>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="AI-assisted information" description={`Status: ${assessment.ai.status.replace("_", " ")}${assessment.ai.mode === "demo" ? " · simulated demo output" : assessment.ai.mode ? ` · ${assessment.ai.mode}` : ""}`}>
        {ai ? (
          <div className="space-y-5">
            <p>{ai.summary}</p>
            <div>
              <h3 className="text-sm font-semibold">Possible explanations</h3>
              <ul className="mt-2 space-y-3">
                {ai.possibleExplanations.map((item) => (
                  <li key={item.name} className="rounded-lg border p-3">
                    <p className="font-medium">{item.name} <span className="font-normal text-muted-foreground">· {item.likelihood.replace("_", " ")}</span></p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.reasoning}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><h3 className="text-sm font-semibold">Information a doctor may ask</h3><ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">{ai.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div><h3 className="text-sm font-semibold">Suggested next steps</h3><ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">{ai.suggestedNextSteps.map((item, index) => <li key={`${item.action}-${index}`}>{item.action} <span className="capitalize">({item.timeframe.replaceAll("_", " ")})</span></li>)}</ul></div>
            </div>
            <div><h3 className="text-sm font-semibold">Seek urgent care if</h3><ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">{ai.whenToSeekUrgentCare.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{ai.disclaimer} {ai.limitations}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{assessment.ai.error?.message ?? assessment.ai.note ?? "AI output is not available. Your case remains available for doctor review."}</p>
            {assessment.ai.canRetry ? <Button variant="outline" disabled={retry.isPending} onClick={() => void handleRetry()}>{retry.isPending ? "Retrying…" : "Retry AI assessment"}</Button> : null}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Doctor review" description={`Case status: ${assessment.status.replaceAll("_", " ")}`}>
        {assessment.assignedDoctor ? <p className="text-sm">Primary reviewer: <span className="font-medium">{assessment.assignedDoctor.name}</span></p> : <p className="text-sm text-muted-foreground">Waiting for a verified doctor to claim this case.</p>}
        {assessment.reviews.length ? (
          <div className="mt-4 space-y-4">
            {assessment.reviews.map((review) => (
              <article key={review.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="font-semibold">{review.kind === "primary" ? "Doctor review" : "Second opinion"}{review.doctor ? ` · ${review.doctor.name}` : ""}</h3>
                  <span className="text-xs text-muted-foreground">{formatDateTime(review.submittedAt)}</span>
                </div>
                <p className="mt-3 text-sm">{review.findings.impression}</p>
                <p className="mt-2 text-sm text-muted-foreground">{review.findings.advice}</p>
                {review.findings.possibleConditions.length ? <p className="mt-2 text-sm">Possible conditions: {review.findings.possibleConditions.join(", ")}</p> : null}
                {review.outcome ? <p className="mt-3 rounded-md bg-muted p-3 text-sm"><span className="font-medium">Second-opinion outcome:</span> {review.outcome.result.replaceAll("_", " ")} — {review.outcome.summary}</p> : null}
              </article>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-muted-foreground">No doctor review has been submitted yet.</p>}
      </SectionCard>

      <SectionCard title="Second opinion" description="A second opinion becomes available after the primary doctor submits a review.">
        {assessment.secondOpinion ? (
          <div className="space-y-2 text-sm">
            <p>Status: <span className="font-medium capitalize">{assessment.secondOpinion.status}</span></p>
            {assessment.secondOpinion.assignedDoctor ? <p>Assigned doctor: {assessment.secondOpinion.assignedDoctor.name}</p> : null}
            {assessment.secondOpinion.reason ? <p>Reason: {assessment.secondOpinion.reason}</p> : null}
            {assessment.secondOpinion.finalOutcome ? <p className="rounded-lg bg-muted p-3">Outcome: {assessment.secondOpinion.finalOutcome.result.replaceAll("_", " ")} — {assessment.secondOpinion.finalOutcome.summary}</p> : null}
          </div>
        ) : assessment.status === "reviewed" ? (
          <div className="space-y-3">
            <label className="block space-y-1 text-sm"><span>Reason <span className="text-muted-foreground">(optional)</span></span><Input maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            <Button disabled={request.isPending} onClick={() => void handleSecondOpinion()}>{request.isPending ? "Requesting…" : "Request second opinion"}</Button>
          </div>
        ) : <p className="text-sm text-muted-foreground">This option will be available after the first doctor review.</p>}
      </SectionCard>

      {assessment.carePlanId ? (
        <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/patient/care-plans">View your care plans</Link>
      ) : null}
      <ClinicalDisclaimer />
    </div>
  );
}
