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
import type { SecondOpinionQueueItem } from "@/types/api";
import { ClinicalDisclaimer, PriorityBadge } from "@/features/clinical/clinical-ui";
import { useClaimSecondOpinion, useSecondOpinions } from "@/features/clinical/hooks";
import { cn } from "cn";

const isAvailable = (item: object): item is SecondOpinionQueueItem => "secondOpinionId" in item;

export default function DoctorSecondOpinionsPage() {
  const router = useRouter();
  const [scope, setScope] = useState<"available" | "mine">("available");
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useSecondOpinions({ scope, page, limit: 20 });
  const claim = useClaimSecondOpinion();
  const items = data?.items ?? [];

  const handleClaim = async (requestId: string) => {
    try {
      const request = await claim.mutateAsync(requestId);
      toast.add({ type: "success", title: "Second opinion claimed" });
      router.push(`/doctor/assessments/${request.assessmentId}`);
    } catch (claimError) {
      toast.add({ type: "error", title: "Couldn't claim second opinion", description: getErrorMessage(claimError) });
      void refetch();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Second opinions" description="Provide an independent review after another doctor has submitted their findings." actions={<Link className={cn(buttonVariants({ variant: "outline" }))} href="/doctor/assessments">Review queue <ArrowRight data-icon="inline-end" /></Link>} />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Second-opinion requests">
        <Button type="button" variant={scope === "available" ? "default" : "outline"} role="tab" aria-selected={scope === "available"} onClick={() => { setScope("available"); setPage(1); }}>Available</Button>
        <Button type="button" variant={scope === "mine" ? "default" : "outline"} role="tab" aria-selected={scope === "mine"} onClick={() => { setScope("mine"); setPage(1); }}>Assigned to me</Button>
        <Button type="button" variant="ghost" onClick={() => void refetch()} aria-label="Refresh second opinions"><RefreshCw aria-hidden /></Button>
      </div>
      <section className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-[15px] font-semibold">{scope === "available" ? "Available requests" : "My second opinions"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Earlier doctor findings remain hidden until you submit your independent review.</p>
        </div>
        {isPending ? <CardSkeleton lines={5} /> : isError ? <div className="p-5"><ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load second opinions" /></div> : items.length === 0 ? (
          <EmptyState title={scope === "available" ? "No open requests" : "No assigned second opinions"} description="Second-opinion requests appear after a primary doctor review." />
        ) : (
          <div className="divide-y px-5">
            {items.map((item) => {
              if (isAvailable(item)) {
                return (
                  <article key={item.secondOpinionId} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">Independent case review</h3><PriorityBadge priority={item.priority} /></div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.symptoms.map((symptom) => symptom.name).join(", ")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Requested {formatDateTime(item.createdAt)}{item.secondOpinionReason ? ` · Reason: ${item.secondOpinionReason}` : ""}</p>
                    </div>
                    <Button disabled={claim.isPending} onClick={() => void handleClaim(item.secondOpinionId)}>{claim.isPending ? "Claiming…" : "Claim request"}</Button>
                  </article>
                );
              }
              const assessmentId = item.assessmentId;
              return (
                <article key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-medium">Assigned second opinion</h3>
                    <p className="mt-1 text-sm capitalize text-muted-foreground">Status: {item.status}</p>
                    {item.assessment ? <p className="mt-1 text-sm text-muted-foreground">{item.assessment.symptoms.map((symptom) => symptom.name).join(", ")}</p> : null}
                    {item.finalOutcome ? <p className="mt-1 text-sm">Outcome: {item.finalOutcome.result.replaceAll("_", " ")}</p> : null}
                  </div>
                  <Link href={`/doctor/assessments/${assessmentId}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Open case <ArrowRight data-icon="inline-end" /></Link>
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
