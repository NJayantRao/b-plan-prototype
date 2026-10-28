"use client";

import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/states";
import { buttonVariants } from "@/components/ui/button";
import { useFacilities } from "@/features/phase-four/hooks";
import { cn } from "cn";

export default function PartnerPage() {
  const facilities = useFacilities("partner");
  return (
    <>
      <PageHeader title="Partner workspace" description="Manage facility submissions for the synthetic prototype directory." />
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Facility directory submissions</h2>
        {facilities.isError ? <div className="mt-3"><ErrorState error={facilities.error} onRetry={() => void facilities.refetch()} /></div> : null}
        <p className="mt-1 text-sm text-muted-foreground">
          {facilities.isPending ? "Loading submissions…" : facilities.data
            ? `${facilities.data.pagination.total} submitted · ${facilities.data.items.filter((item) => item.verificationStatus === "pending").length} pending review`
            : "Submission counts unavailable"}
        </p>
        <Link className={cn(buttonVariants({ size: "sm" }), "mt-4")} href="/partner/facilities">Manage facilities</Link>
      </section>
      <p className="mt-4 text-xs text-muted-foreground">Facility listings are prototype data and do not represent operational referrals.</p>
    </>
  );
}
