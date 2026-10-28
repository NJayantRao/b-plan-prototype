"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";
import type { AssessmentQueueItem, DoctorAssessmentSummary } from "@/types/api";
import { ClinicalDisclaimer, PriorityBadge } from "@/features/clinical/clinical-ui";
import { useAssessments, useClaimAssessment } from "@/features/clinical/hooks";
import { cn } from "cn";

export default function DoctorAssessmentsPage() {
  const router = useRouter();
  const [scope, setScope] = useState<"queue" | "mine">("queue");
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useAssessments({ scope, page, limit: 20 });
  const claim = useClaimAssessment();
  const items = data?.items ?? [];

  const handleClaim = async (id: string) => {
    try {
      await claim.mutateAsync(id);
      toast.add({ type: "success", title: "Case claimed" });
      router.push(`/doctor/assessments/${id}`);
    } catch (claimError) {
      toast.add({ type: "error", title: "Couldn't claim case", description: getErrorMessage(claimError) });
      void refetch();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Assessment review" description="Review the priority queue or return to cases assigned to you." actions={<Link className={cn(buttonVariants({ variant: "outline" }))} href="/doctor/second-opinions">Second opinions <ArrowRight data-icon="inline-end" /></Link>} />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Assessment cases">
        <Button type="button" variant={scope === "queue" ? "default" : "outline"} role="tab" aria-selected={scope === "queue"} onClick={() => { setScope("queue"); setPage(1); }}>Review queue</Button>
        <Button type="button" variant={scope === "mine" ? "default" : "outline"} role="tab" aria-selected={scope === "mine"} onClick={() => { setScope("mine"); setPage(1); }}>My cases</Button>
        <Button type="button" variant="ghost" onClick={() => void refetch()} aria-label="Refresh cases"><RefreshCw aria-hidden /></Button>
      </div>
      <section className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-[15px] font-semibold">{scope === "queue" ? "Available cases" : "Cases assigned to me"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{scope === "queue" ? "Unclaimed cases are ordered by urgency, then submission time. Queue previews do not show patient identity." : "Primary reviews and assigned second opinions."}</p>
        </div>
        {isPending ? <CardSkeleton lines={5} /> : isError ? <div className="p-5"><ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load cases" /></div> : items.length === 0 ? (
          <EmptyState title={scope === "queue" ? "The queue is clear" : "No assigned cases"} description={scope === "queue" ? "New patient assessments will appear here." : "Claim a case or second opinion to get started."} />
        ) : (
          <div className="divide-y px-5">
            {items.map((item) => {
              const queueItem = "type" in item ? item as AssessmentQueueItem : null;
              const mineItem = "role" in item ? item as DoctorAssessmentSummary : null;
              const id = item.id;
              const symptoms = item.symptoms.map((symptom) => symptom.name).join(", ");
              return (
                <article key={id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{queueItem ? "Patient case" : mineItem?.patient?.name ?? "Assigned case"}</h3>
                      <PriorityBadge priority={item.priority} />
                      {queueItem && queueItem.safety.level !== "none" ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">Safety: {queueItem.safety.level}</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{symptoms || "Symptoms not listed"}</p>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">{queueItem ? `Received ${formatDateTime(queueItem.createdAt)} · AI ${queueItem.ai.status}${queueItem.ai.mode === "demo" ? " (demo)" : ""}` : `${mineItem?.role.replaceAll("_", " ")} · ${mineItem?.status.replaceAll("_", " ")} · updated ${formatDateTime(mineItem?.updatedAt)}`}</p>
                  </div>
                  {queueItem ? (
                    <Button disabled={claim.isPending} onClick={() => void handleClaim(id)}>{claim.isPending ? "Claiming…" : "Claim case"}</Button>
                  ) : (
                    <Link href={`/doctor/assessments/${id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Open case <ArrowRight data-icon="inline-end" /></Link>
                  )}
                </article>
              );
            })}
          </div>
        )}
        {data ? <Pagination pagination={data.pagination} onPageChange={setPage} disabled={isPending} /> : null}
      </section>
      <ClinicalDisclaimer />
    </div>
  );
}
