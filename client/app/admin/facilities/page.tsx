"use client";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api/errors";
import { useFacilities, useVerifyFacility } from "@/features/phase-four/hooks";

export default function AdminFacilitiesPage() {
  const facilities = useFacilities("admin");
  const verify = useVerifyFacility();

  return (
    <>
      <PageHeader title="Partner facilities" description="Review facilities submitted by partner accounts." />
      <section className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Facility verification queue</h2></div>
        {facilities.isPending ? <p className="p-5 text-sm text-muted-foreground">Loading facilities…</p> :
          facilities.isError ? <div className="p-5"><ErrorState error={facilities.error} onRetry={() => void facilities.refetch()} /></div> :
          facilities.data.items.length === 0 ? <EmptyState title="No facility submissions" description="Partner submissions will appear here." /> :
          <ul className="divide-y">
            {facilities.data.items.map((facility) => (
              <li key={facility.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{facility.name}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{facility.verificationStatus}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {facility.type.replace("_", " ")} · {facility.address.city}, {facility.address.state} {facility.address.pincode ?? ""} · {facility.address.country}
                    </p>
                    {facility.supportedServices.length ? <p className="mt-1 text-sm">Services: {facility.supportedServices.join(", ")}</p> : null}
                    {facility.contactPhone || facility.contactEmail ? (
                      <p className="mt-1 text-sm text-muted-foreground">{[facility.contactPhone, facility.contactEmail].filter(Boolean).join(" · ")}</p>
                    ) : null}
                    {facility.verification?.notes ? <p className="mt-2 text-sm text-muted-foreground">Previous note: {facility.verification.notes}</p> : null}
                  </div>
                  {facility.verificationStatus === "pending" ? (
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" disabled={verify.isPending} onClick={() => verify.mutate({ id: facility.id, status: "verified" })}>Verify</Button>
                      <Button size="sm" variant="outline" disabled={verify.isPending} onClick={() => {
                        const notes = window.prompt("Optional note for the partner");
                        if (notes !== null) verify.mutate({ id: facility.id, status: "rejected", ...(notes.trim() ? { notes: notes.trim() } : {}) });
                      }}>Reject</Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>}
        {verify.isError ? <p role="alert" className="px-5 pb-4 text-sm text-destructive">{getErrorMessage(verify.error)}</p> : null}
      </section>
    </>
  );
}
