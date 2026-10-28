"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CardSkeleton, ErrorState } from "@/components/common/states";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/features/auth/auth-provider";
import type { DoctorAssessment, ReviewUrgency, AiAgreement, SecondOpinionOutcome, CareTaskType } from "@/types/api";
import { ClinicalDisclaimer, PriorityBadge, SafetyNotice, SectionCard } from "./clinical-ui";
import { useAssessment, useCreateCarePlan, useSubmitReview } from "./hooks";

export function DoctorAssessmentDetail({ id }: { id: string }) {
  const { data, isPending, isError, error, refetch } = useAssessment(id);
  const submitReview = useSubmitReview();
  const createPlan = useCreateCarePlan();
  const { user } = useAuth();
  const [impression, setImpression] = useState("");
  const [conditions, setConditions] = useState("");
  const [tests, setTests] = useState("");
  const [urgency, setUrgency] = useState<ReviewUrgency>("routine");
  const [advice, setAdvice] = useState("");
  const [notes, setNotes] = useState("");
  const [agreement, setAgreement] = useState<AiAgreement>("agree");
  const [differences, setDifferences] = useState("");
  const [outcome, setOutcome] = useState<SecondOpinionOutcome>("confirms_primary");
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [planTitle, setPlanTitle] = useState("");
  const [planSummary, setPlanSummary] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState<CareTaskType>("follow_up");

  if (isPending) return <CardSkeleton lines={6} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load this case" />;
  if (!data || !("role" in data)) return <ErrorState error={new Error("This case is not available in the doctor view.")} />;

  const assessment: DoctorAssessment = data;
  const secondDoctor = assessment.role === "second_opinion";
  const canReview = secondDoctor
    ? assessment.status === "second_opinion" && assessment.secondOpinion?.status === "assigned"
    : assessment.status === "in_review";
  const hasMyReview = assessment.reviews.some((review) => review.doctor?.id === user?.id);
  const canCreatePlan = hasMyReview && !assessment.carePlanId;

  const handleReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    try {
      await submitReview.mutateAsync({
        id: assessment.id,
        input: {
          findings: {
            impression: impression.trim(),
            possibleConditions: conditions.split(",").map((item) => item.trim()).filter(Boolean),
            recommendedTests: tests.split(",").map((item) => item.trim()).filter(Boolean),
            urgency,
            advice: advice.trim(),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          },
          aiComparison: {
            agreement: assessment.ai.status === "completed" ? agreement : "not_assessed",
            ...(agreement !== "agree" && agreement !== "not_assessed" && differences.trim() ? { differences: differences.trim() } : {}),
          },
          ...(secondDoctor ? { outcome: { result: outcome, summary: outcomeSummary.trim() } } : {}),
        },
      });
      toast.add({ type: "success", title: "Review submitted" });
      setImpression("");
      setAdvice("");
    } catch (reviewError) {
      toast.add({ type: "error", title: "Couldn't submit review", description: getErrorMessage(reviewError) });
    }
  };

  const handleCreatePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    try {
      await createPlan.mutateAsync({
        assessmentId: assessment.id,
        title: planTitle.trim(),
        ...(planSummary.trim() ? { summary: planSummary.trim() } : {}),
        tasks: [{ title: taskTitle.trim(), type: taskType }],
      });
      toast.add({ type: "success", title: "Care plan created" });
      setPlanTitle("");
      setPlanSummary("");
      setTaskTitle("");
    } catch (planError) {
      toast.add({ type: "error", title: "Couldn't create care plan", description: getErrorMessage(planError) });
    }
  };

  const ai = assessment.ai.result;
  return (
    <div className="space-y-6">
      <PageHeader
        title={secondDoctor ? "Second-opinion review" : "Assessment review"}
        description={`Patient ${assessment.patient.name} · case submitted ${formatDateTime(assessment.createdAt)} · ${assessment.patient.ageYears ?? "Age not provided"} years`}
        actions={<PriorityBadge priority={assessment.priority} />}
      />
      {assessment.safety.level !== "none" ? <SafetyNotice safety={assessment.safety} /> : null}
      <SectionCard title="Patient context" description={assessment.description ?? undefined}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><h3 className="text-sm font-semibold">Symptoms</h3><ul className="mt-2 space-y-2 text-sm">{assessment.symptoms.map((symptom, index) => <li key={`${symptom.name}-${index}`}>{symptom.name} · {symptom.severity} · {symptom.duration.value} {symptom.duration.unit}</li>)}</ul></div>
          <div className="space-y-3 text-sm"><p><span className="font-semibold">Gender:</span> {assessment.patient.gender ?? "Not specified"}</p><p><span className="font-semibold">Allergies:</span> {assessment.patient.allergies.join(", ") || "None listed"}</p><p><span className="font-semibold">Current medications:</span> {assessment.patient.currentMedications.join(", ") || "None listed"}</p><p><span className="font-semibold">Conditions:</span> {assessment.patient.conditions.join(", ") || "None listed"}</p></div>
        </div>
      </SectionCard>
      <SectionCard title="Safety screening">
        <SafetyNotice safety={assessment.safety} />
      </SectionCard>
      <SectionCard title="AI assessment" description={`Status: ${assessment.ai.status.replaceAll("_", " ")}${assessment.ai.mode === "demo" ? " · simulated demo output" : assessment.ai.mode ? ` · ${assessment.ai.mode}` : ""}`}>
        {ai ? (
          <div className="space-y-3 text-sm">
            <p>{ai.summary}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><h3 className="font-semibold">Possible explanations</h3><ul className="mt-1 list-inside list-disc text-muted-foreground">{ai.possibleExplanations.map((item) => <li key={item.name}>{item.name} · {item.likelihood.replaceAll("_", " ")}</li>)}</ul></div>
              <div><h3 className="font-semibold">Next steps</h3><ul className="mt-1 list-inside list-disc text-muted-foreground">{ai.suggestedNextSteps.map((item, index) => <li key={`${item.action}-${index}`}>{item.action}</li>)}</ul></div>
            </div>
            <p className="rounded-lg bg-amber-50 p-3 text-amber-950">{ai.disclaimer} {ai.limitations}</p>
          </div>
        ) : <p className="text-sm text-muted-foreground">No AI assessment is available; complete your review using your independent clinical judgement.</p>}
      </SectionCard>

      <SectionCard title="Doctor findings" description={assessment.reviewsHiddenForIndependence ? "Earlier findings are hidden so you can form an independent second opinion." : "Submitted findings are preserved as a separate clinical review."}>
        {assessment.reviews.length ? (
          <div className="space-y-3">
            {assessment.reviews.map((review) => (
              <article key={review.id} className="rounded-lg border p-3">
                <p className="font-medium">{review.kind === "primary" ? "Primary review" : "Second opinion"} · {review.doctor?.name ?? "Doctor"} · {formatDateTime(review.submittedAt)}</p>
                <p className="mt-2 text-sm">{review.findings.impression}</p>
                <p className="mt-1 text-sm text-muted-foreground">{review.findings.advice}</p>
                {review.outcome ? <p className="mt-2 text-sm">Outcome: {review.outcome.result.replaceAll("_", " ")} — {review.outcome.summary}</p> : null}
              </article>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">{assessment.reviewsHiddenForIndependence ? "Previous review details are intentionally hidden." : "No review has been submitted."}</p>}
      </SectionCard>

      {canReview ? (
        <SectionCard title="Submit your review">
          <form onSubmit={handleReview} className="space-y-4">
            <label className="block space-y-1 text-sm"><span>Clinical impression</span><Textarea required maxLength={2000} rows={3} value={impression} onChange={(event) => setImpression(event.target.value)} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1 text-sm"><span>Possible conditions <span className="text-muted-foreground">(comma-separated)</span></span><Input value={conditions} onChange={(event) => setConditions(event.target.value)} placeholder="e.g. condition one, condition two" /></label>
              <label className="block space-y-1 text-sm"><span>Recommended tests <span className="text-muted-foreground">(comma-separated)</span></span><Input value={tests} onChange={(event) => setTests(event.target.value)} /></label>
            </div>
            <label className="block space-y-1 text-sm"><span>Urgency</span><select className="h-8 w-full rounded-lg border border-input bg-background px-2" value={urgency} onChange={(event) => setUrgency(event.target.value as ReviewUrgency)}><option value="routine">Routine</option><option value="soon">Soon</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option></select></label>
            <label className="block space-y-1 text-sm"><span>Advice and care recommendations</span><Textarea required maxLength={2000} rows={3} value={advice} onChange={(event) => setAdvice(event.target.value)} /></label>
            <label className="block space-y-1 text-sm"><span>Notes <span className="text-muted-foreground">(optional)</span></span><Textarea maxLength={2000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            {assessment.ai.status === "completed" ? (
              <div className="space-y-3 rounded-lg border p-4">
                <label className="block space-y-1 text-sm"><span>Comparison with AI assessment</span><select className="h-8 w-full rounded-lg border border-input bg-background px-2" value={agreement} onChange={(event) => setAgreement(event.target.value as AiAgreement)}><option value="agree">Agree</option><option value="partially_agree">Partially agree</option><option value="disagree">Disagree</option></select></label>
                {agreement !== "agree" ? <label className="block space-y-1 text-sm"><span>Describe the differences</span><Textarea required maxLength={1500} rows={2} value={differences} onChange={(event) => setDifferences(event.target.value)} /></label> : null}
              </div>
            ) : <p className="text-sm text-muted-foreground">AI comparison is not applicable because no AI output is available.</p>}
            {secondDoctor ? (
              <div className="space-y-3 rounded-lg border p-4">
                <label className="block space-y-1 text-sm"><span>Second-opinion outcome</span><select className="h-8 w-full rounded-lg border border-input bg-background px-2" value={outcome} onChange={(event) => setOutcome(event.target.value as SecondOpinionOutcome)}><option value="confirms_primary">Confirms primary review</option><option value="differs_from_primary">Differs from primary review</option><option value="inconclusive">Inconclusive</option></select></label>
                <label className="block space-y-1 text-sm"><span>Outcome summary</span><Textarea required maxLength={2000} rows={3} value={outcomeSummary} onChange={(event) => setOutcomeSummary(event.target.value)} /></label>
              </div>
            ) : null}
            <Button type="submit" disabled={submitReview.isPending}>{submitReview.isPending ? "Submitting…" : "Submit review"}</Button>
          </form>
        </SectionCard>
      ) : null}

      {canCreatePlan ? (
        <SectionCard title="Create care plan" description="Add an initial task for the patient to track. You can adjust task details later.">
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <label className="block space-y-1 text-sm"><span>Plan title</span><Input required maxLength={150} value={planTitle} onChange={(event) => setPlanTitle(event.target.value)} /></label>
            <label className="block space-y-1 text-sm"><span>Summary <span className="text-muted-foreground">(optional)</span></span><Textarea maxLength={2000} rows={2} value={planSummary} onChange={(event) => setPlanSummary(event.target.value)} /></label>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <label className="block space-y-1 text-sm"><span>First task</span><Input required maxLength={200} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} /></label>
              <label className="block space-y-1 text-sm"><span>Task type</span><select className="h-8 w-full rounded-lg border border-input bg-background px-2" value={taskType} onChange={(event) => setTaskType(event.target.value as CareTaskType)}><option value="follow_up">Follow-up</option><option value="test">Test</option><option value="medication">Medication</option><option value="referral">Referral</option><option value="lifestyle">Lifestyle</option><option value="other">Other</option></select></label>
            </div>
            <Button type="submit" disabled={createPlan.isPending}>{createPlan.isPending ? "Creating…" : "Create care plan"}</Button>
          </form>
        </SectionCard>
      ) : assessment.carePlanId ? (
        <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/doctor/care-plans">View care plan</Link>
      ) : null}
      <ClinicalDisclaimer />
    </div>
  );
}
