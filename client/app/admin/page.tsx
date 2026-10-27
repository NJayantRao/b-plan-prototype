"use client";

import { ArrowRight, ShieldCheck, ShieldQuestion, ShieldX } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common/states";
import { OutcomeBadge } from "@/components/common/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { useAdminDoctors, useAuditLogs, useDoctorCounts } from "@/features/admin/hooks";
import { formatDateTime, fullName } from "@/lib/format";
import { cn } from "cn";

export default function AdminOverviewPage() {
  const counts = useDoctorCounts();
  const pending = useAdminDoctors({ status: "pending", page: 1, limit: 5 });
  const recent = useAuditLogs({ page: 1, limit: 8 });

  return (
    <>
      <PageHeader title="Overview" description="Doctor verification queue and recent platform activity." />

      {counts.isError ? (
        <ErrorState error={counts.error} onRetry={counts.refetch} title="Couldn't load doctor counts" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Awaiting verification" value={counts.counts.pending} hint="Doctors in the review queue" icon={ShieldQuestion} loading={counts.isPending} />
          <StatCard label="Verified doctors" value={counts.counts.verified} hint="Cleared for clinical work" icon={ShieldCheck} loading={counts.isPending} />
          <StatCard label="Rejected" value={counts.counts.rejected} hint="Not approved" icon={ShieldX} loading={counts.isPending} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-[15px] font-semibold">Needs your review</h2>
            <Link href="/admin/doctors" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              All doctors <ArrowRight data-icon="inline-end" />
            </Link>
          </div>
          {pending.isPending ? (
            <TableSkeleton rows={3} cols={2} />
          ) : pending.isError ? (
            <div className="p-5"><ErrorState error={pending.error} onRetry={() => void pending.refetch()} /></div>
          ) : pending.data.items.length === 0 ? (
            <EmptyState title="You're all caught up" description="No doctors are waiting for verification." />
          ) : (
            <ul className="divide-y">
              {pending.data.items.map((doctor) => (
                <li key={doctor.userId} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {doctor.user ? fullName(doctor.user.firstName, doctor.user.lastName) : "Unknown"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doctor.specialties.join(", ") || "No specialty yet"} · {doctor.licenseNumber ?? "No licence"}
                    </p>
                  </div>
                  <Link href="/admin/doctors" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Review</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-[15px] font-semibold">Recent activity</h2>
            <Link href="/admin/audit-logs" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Audit logs <ArrowRight data-icon="inline-end" />
            </Link>
          </div>
          {recent.isPending ? (
            <TableSkeleton rows={5} cols={2} />
          ) : recent.isError ? (
            <div className="p-5"><ErrorState error={recent.error} onRetry={() => void recent.refetch()} /></div>
          ) : recent.data.items.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <ul className="divide-y">
              {recent.data.items.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)} · {log.actorRole ?? "anonymous"}
                    </p>
                  </div>
                  <OutcomeBadge outcome={log.outcome} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
