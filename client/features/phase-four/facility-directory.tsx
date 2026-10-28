"use client";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { useFacilities } from "./hooks";

export function FacilityDirectory({ role }: { role: "patient" | "doctor" }) {
  const facilities = useFacilities(role);
  return (
    <>
      <PageHeader title="Verified facilities" description="Browse facilities that have been approved for the prototype directory." />
      <section className="rounded-xl border bg-card">
        {facilities.isPending ? <p className="p-5 text-sm text-muted-foreground">Loading facilities…</p> :
          facilities.isError ? <div className="p-5"><ErrorState error={facilities.error} onRetry={() => void facilities.refetch()} /></div> :
          facilities.data.items.length === 0 ? <EmptyState title="No verified facilities listed" /> :
          <ul className="divide-y">
            {facilities.data.items.map((facility) => (
              <li key={facility.id} className="px-5 py-4">
                <p className="font-medium">{facility.name}</p>
                <p className="text-sm capitalize text-muted-foreground">
                  {facility.type.replace("_", " ")} · {facility.address.city}, {facility.address.state} · {facility.address.country}
                  {facility.address.pincode ? ` ${facility.address.pincode}` : ""}
                </p>
                {facility.supportedServices.length ? <p className="mt-1 text-sm">Services: {facility.supportedServices.join(", ")}</p> : null}
                <p className="mt-1 text-sm text-muted-foreground">
                  {[facility.contactPhone, facility.contactEmail].filter(Boolean).join(" · ") || "No contact details listed"}
                </p>
              </li>
            ))}
          </ul>}
      </section>
      <p className="mt-3 text-xs text-muted-foreground">Listings are synthetic prototype data and do not provide referrals or medical services.</p>
    </>
  );
}
