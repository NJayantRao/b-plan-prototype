"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api/errors";
import { useCancelEmergency, useCreateEmergency, useEmergencies } from "@/features/phase-four/hooks";

export default function PatientEmergenciesPage() {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [urgency, setUrgency] = useState<"urgent" | "critical">("urgent");
  const [description, setDescription] = useState("");
  const cases = useEmergencies("patient");
  const create = useCreateEmergency();
  const cancel = useCancelEmergency();

  const submit = async () => {
    await create.mutateAsync({
      location: { city: city.trim(), state: state.trim(), ...(address.trim() ? { address: address.trim() } : {}) },
      urgency,
      description: description.trim(),
    });
    setDescription("");
  };

  return (
    <>
      <PageHeader title="Emergency simulation" description="Create and track a simulated emergency case for product demonstration." />
      <div role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-950">
        <strong>This is not emergency assistance.</strong> The app does not contact emergency services, hospitals, or responders. If you need urgent help, contact your local emergency number directly.
      </div>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Create a simulated case</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">City<Input className="mt-1" value={city} onChange={(event) => setCity(event.target.value)} /></label>
          <label className="text-sm">State<Input className="mt-1" value={state} onChange={(event) => setState(event.target.value)} /></label>
        </div>
        <label className="mt-3 block text-sm">Street-level address (visible only to you and assigned test responder)
          <Input className="mt-1" maxLength={300} value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Urgency
            <select className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3" value={urgency} onChange={(event) => setUrgency(event.target.value as "urgent" | "critical")}>
              <option value="urgent">Urgent</option><option value="critical">Critical</option>
            </select>
          </label>
          <label className="text-sm">Description
            <Textarea className="mt-1" rows={2} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
        </div>
        <Button className="mt-4" disabled={create.isPending || !city.trim() || !state.trim() || !description.trim()} onClick={() => void submit()}>
          {create.isPending ? "Creating…" : "Create simulated case"}
        </Button>
        {create.isError ? <p role="alert" className="mt-3 text-sm text-destructive">{getErrorMessage(create.error)}</p> : null}
      </section>

      <section className="mt-6 rounded-xl border bg-card">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">My simulated cases</h2></div>
        {cases.isPending ? <p className="p-5 text-sm text-muted-foreground">Loading cases…</p> :
          cases.isError ? <div className="p-5"><ErrorState error={cases.error} onRetry={() => void cases.refetch()} /></div> :
          cases.data.items.length === 0 ? <EmptyState title="No cases recorded" /> :
          <ul className="divide-y">
            {cases.data.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">{item.urgency} · {item.location.city}, {item.location.state}</p>
                  <p className="text-sm text-muted-foreground">{item.status.replace("_", " ")} · simulated ETA {item.estimatedArrivalMinutes} min</p>
                  <p className="mt-1 text-sm">{item.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.simulationNotice}</p>
                </div>
                {["queued", "assigned"].includes(item.status) ? (
                  <Button size="sm" variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate(item.id)}>Cancel case</Button>
                ) : null}
              </li>
            ))}
          </ul>}
        {cancel.isError ? <p role="alert" className="px-5 pb-4 text-sm text-destructive">{getErrorMessage(cancel.error)}</p> : null}
      </section>
    </>
  );
}
