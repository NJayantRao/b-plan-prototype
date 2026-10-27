"use client";

import { Stethoscope } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common/states";
import { VerificationBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminDoctors } from "@/features/admin/hooks";
import { ReviewDialog } from "@/features/admin/review-dialog";
import { formatDate, fullName } from "@/lib/format";
import type { AdminDoctorRow, VerificationStatus } from "@/types/api";
import { cn } from "cn";

const PAGE_SIZE = 10;
const FILTERS: { value: VerificationStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminDoctorsPage() {
  const [status, setStatus] = useState<VerificationStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<AdminDoctorRow | null>(null);

  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } =
    useAdminDoctors({ status, page, limit: PAGE_SIZE });

  return (
    <>
      <PageHeader
        title="Doctors"
        description="Review credentials and control who receives clinical permissions. Every decision is audited."
      />

      <div role="group" aria-label="Filter by status" className="mb-4 inline-flex rounded-lg border bg-card p-1">
        {FILTERS.map((filter) => {
          const active = filter.value === status;
          return (
            <button
              key={filter.label}
              type="button"
              aria-pressed={active}
              onClick={() => { setStatus(filter.value); setPage(1); }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isPending ? (
          <TableSkeleton rows={5} cols={5} />
        ) : isError ? (
          <div className="p-6"><ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load doctors" /></div>
        ) : data.items.length === 0 ? (
          <EmptyState
            title={status ? `No ${status} doctors` : "No doctors yet"}
            description="Doctor accounts are provisioned by an administrator and appear here once created."
          />
        ) : (
          <div className={cn("transition-opacity", isPlaceholderData && isFetching && "opacity-60")}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {["Doctor", "Specialties", "Licence", "Status", "Updated", ""].map((h) => (
                      <TableHead key={h} className="h-10 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((doctor) => (
                    <TableRow key={doctor.userId}>
                      <TableCell>
                        <p className="font-medium">
                          {doctor.user ? fullName(doctor.user.firstName, doctor.user.lastName) : "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">{doctor.user?.email}</p>
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-muted-foreground">
                        {doctor.specialties.join(", ") || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {doctor.licenseNumber ?? <span className="text-muted-foreground">Not provided</span>}
                      </TableCell>
                      <TableCell><VerificationBadge status={doctor.verificationStatus} /></TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(doctor.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={doctor.verificationStatus === "pending" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setReviewing(doctor)}
                        >
                          <Stethoscope data-icon="inline-start" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination pagination={data.pagination} onPageChange={setPage} disabled={isFetching} />
          </div>
        )}
      </div>

      <ReviewDialog doctor={reviewing} onClose={() => setReviewing(null)} />
    </>
  );
}
