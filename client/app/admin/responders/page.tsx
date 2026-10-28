"use client";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api/errors";
import { useAdminResponders, useSetResponderAuthorization } from "@/features/phase-four/hooks";

export default function AdminRespondersPage() {
  const responders = useAdminResponders();
  const authorization = useSetResponderAuthorization();

  return (
    <>
      <PageHeader title="Responder authorization" description="Authorize existing responder accounts for simulated emergency workflows." />
      <div role="alert" className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        Responder access applies only to the prototype queue. It does not notify or dispatch any real-world service.
      </div>
      <section className="rounded-xl border bg-card">
        {responders.isPending ? <p className="p-5 text-sm text-muted-foreground">Loading responder accounts…</p> :
          responders.isError ? <div className="p-5"><ErrorState error={responders.error} onRetry={() => void responders.refetch()} /></div> :
          responders.data.items.length === 0 ? <EmptyState title="No responder accounts" description="Responder accounts must be created through the approved account provisioning process." /> :
          <ul className="divide-y">
            {responders.data.items.map((responder) => (
              <li key={responder.userId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{responder.firstName} {responder.lastName}</p>
                  <p className="text-sm text-muted-foreground">{responder.email} · {responder.status}</p>
                  <p className="mt-1 text-sm">
                    Authorization: <span className={responder.authorized ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>
                      {responder.authorized ? "Authorized" : "Not authorized"}
                    </span>
                  </p>
                </div>
                {responder.status === "active" ? (
                  <Button
                    variant={responder.authorized ? "outline" : "default"}
                    size="sm"
                    disabled={authorization.isPending}
                    onClick={() => authorization.mutate({ id: responder.userId, authorized: !responder.authorized })}
                  >
                    {responder.authorized ? "Revoke authorization" : "Authorize responder"}
                  </Button>
                ) : <span className="text-xs text-muted-foreground">Suspended account</span>}
              </li>
            ))}
          </ul>}
        {authorization.isError ? <p role="alert" className="px-5 pb-4 text-sm text-destructive">{getErrorMessage(authorization.error)}</p> : null}
      </section>
    </>
  );
}
