"use client";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api/errors";
import { useClaimEmergency, useEmergencies, useUpdateEmergency } from "@/features/phase-four/hooks";

export default function ResponderPage() {
  const cases = useEmergencies("responder");
  const claim = useClaimEmergency();
  const update = useUpdateEmergency();

  return (
    <>
      <PageHeader title="Simulated emergency queue" description="Claim and advance test cases in the prototype only." />
      <div role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-950">
        Simulation only. No ambulance, emergency service, hospital, or real responder is contacted.
      </div>
      <section className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Available and assigned cases</h2></div>
        {cases.isPending ? <p className="p-5 text-sm text-muted-foreground">Loading cases…</p> :
          cases.isError ? <div className="p-5"><ErrorState error={cases.error} onRetry={() => void cases.refetch()} /></div> :
          cases.data.items.length === 0 ? <EmptyState title="No cases in the queue" description="The queue refreshes automatically." /> :
          <ul className="divide-y">
            {cases.data.items.map((item) => {
              const isAssignedToMe = item.assignedResponder !== null;
              const nextStatus = item.status === "assigned" ? "en_route" : item.status === "en_route" ? "arrived" : item.status === "arrived" ? "completed" : null;
              return (
                <li key={item.id} className="px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{item.urgency} · {item.location.city}, {item.location.state}</p>
                      <p className="text-sm text-muted-foreground">Status: {item.status.replace("_", " ")} · simulated ETA {item.estimatedArrivalMinutes} min</p>
                      <p className="mt-1 text-sm">{item.description}</p>
                      {item.location.address ? <p className="mt-1 text-sm text-muted-foreground">Assigned case address: {item.location.address}</p> : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {item.status === "queued" ? (
                        <Button size="sm" disabled={claim.isPending} onClick={() => claim.mutate(item.id)}>
                          {claim.isPending ? "Claiming…" : "Claim test case"}
                        </Button>
                      ) : isAssignedToMe && nextStatus ? (
                        <Button size="sm" disabled={update.isPending} onClick={() => update.mutate({ id: item.id, status: nextStatus })}>
                          Mark {nextStatus.replace("_", " ")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>}
        {claim.isError || update.isError ? (
          <p role="alert" className="px-5 pb-4 text-sm text-destructive">{getErrorMessage(claim.error ?? update.error)}</p>
        ) : null}
      </section>
    </>
  );
}
