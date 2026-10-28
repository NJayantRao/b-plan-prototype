"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api/errors";
import { useCreateDonorRequest, useDonorProfile, useDonorRequests, useSaveDonorProfile, useUpdateDonorRequest } from "@/features/phase-four/hooks";
import type { BloodGroup, DonorProfile, DonationType } from "@/features/phase-four/api";

const donationTypes: { value: DonationType; label: string }[] = [
  { value: "whole_blood", label: "Whole blood" },
  { value: "plasma", label: "Plasma" },
  { value: "platelets", label: "Platelets" },
];
const bloodGroups: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function PatientDonorsPage() {
  const profile = useDonorProfile();
  const requests = useDonorRequests();
  const createRequest = useCreateDonorRequest();
  const updateRequest = useUpdateDonorRequest();
  const [requestType, setRequestType] = useState<DonationType>("whole_blood");
  const [requestBlood, setRequestBlood] = useState<BloodGroup | "">("");
  const [requestCity, setRequestCity] = useState("");
  const [requestState, setRequestState] = useState("");

  const submitRequest = async () => {
    await createRequest.mutateAsync({
      donationType: requestType,
      ...(requestBlood ? { bloodGroup: requestBlood } : {}),
      city: requestCity.trim(),
      state: requestState.trim(),
    });
    setRequestCity("");
    setRequestState("");
  };

  return (
    <>
      <PageHeader title="Donor availability" description="Register your consented availability or create a synthetic donor match request." />
      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        Donor matching is simulated. Names and contact details are never shown, and no donor is contacted.
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">My donor profile</h2>
          {profile.isPending ? <p className="mt-4 text-sm text-muted-foreground">Loading profile…</p> :
            profile.isError ? <div className="mt-4"><ErrorState error={profile.error} onRetry={() => void profile.refetch()} /></div> : (
              <DonorProfileEditor key={profile.data?.updatedAt ?? "new"} profile={profile.data} />
            )}
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Request donor matches</h2>
          <p className="mt-1 text-sm text-muted-foreground">Matches are synthetic and reflect only opted-in availability.</p>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">Donation type
              <select className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3" value={requestType} onChange={(event) => setRequestType(event.target.value as DonationType)}>
                {donationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label className="block text-sm">Blood group (optional)
              <select className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3" value={requestBlood} onChange={(event) => setRequestBlood(event.target.value as BloodGroup | "")}>
                <option value="">Any / not specified</option>{bloodGroups.map((group) => <option key={group}>{group}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">City<Input className="mt-1" value={requestCity} onChange={(event) => setRequestCity(event.target.value)} /></label>
              <label className="text-sm">State<Input className="mt-1" value={requestState} onChange={(event) => setRequestState(event.target.value)} /></label>
            </div>
            <Button disabled={createRequest.isPending || !requestCity.trim() || !requestState.trim()} onClick={() => void submitRequest()}>
              {createRequest.isPending ? "Finding matches…" : "Create simulated request"}
            </Button>
            {createRequest.isError ? <p role="alert" className="text-sm text-destructive">{getErrorMessage(createRequest.error)}</p> : null}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border bg-card">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">My donor requests</h2></div>
        {requests.isPending ? <p className="p-5 text-sm text-muted-foreground">Loading requests…</p> :
          requests.isError ? <div className="p-5"><ErrorState error={requests.error} onRetry={() => void requests.refetch()} /></div> :
          requests.data.items.length === 0 ? <EmptyState title="No donor requests" /> :
          <ul className="divide-y">
            {requests.data.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{item.donationType.replace("_", " ")}{item.bloodGroup ? ` · ${item.bloodGroup}` : ""} · {item.city}, {item.state}</p>
                  <p className="text-sm text-muted-foreground">{item.matchedDonorCount} anonymous match(es) · {item.status}</p>
                </div>
                {item.status === "open" || item.status === "matched" ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={updateRequest.isPending} onClick={() => updateRequest.mutate({ id: item.id, status: "cancelled" })}>Cancel</Button>
                    <Button size="sm" variant="outline" disabled={updateRequest.isPending} onClick={() => updateRequest.mutate({ id: item.id, status: "fulfilled" })}>Mark fulfilled</Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>}
        {updateRequest.isError ? <p role="alert" className="px-5 pb-4 text-sm text-destructive">{getErrorMessage(updateRequest.error)}</p> : null}
      </section>
    </>
  );
}

function DonorProfileEditor({ profile }: { profile: DonorProfile | null }) {
  const save = useSaveDonorProfile();
  const [donationTypesSelected, setDonationTypesSelected] = useState<DonationType[]>(() => profile?.donationTypes ?? []);
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "">(() => profile?.bloodGroup ?? "");
  const [city, setCity] = useState(() => profile?.city ?? "");
  const [state, setState] = useState(() => profile?.state ?? "");
  const [available, setAvailable] = useState(() => profile?.available ?? true);
  const [consentGranted, setConsentGranted] = useState(() => profile?.consentGranted ?? false);

  const toggleDonationType = (type: DonationType) => setDonationTypesSelected((current) =>
    current.includes(type) ? current.filter((value) => value !== type) : [...current, type],
  );
  const saveProfile = () => save.mutate({
    donationTypes: donationTypesSelected,
    ...(bloodGroup ? { bloodGroup } : {}),
    city: city.trim(),
    state: state.trim(),
    available,
    consentGranted,
  });

  return (
    <div className="mt-4 space-y-4">
      <fieldset>
        <legend className="text-sm font-medium">Donation types</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {donationTypes.map((type) => (
            <label key={type.value} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={donationTypesSelected.includes(type.value)} onChange={() => toggleDonationType(type.value)} />
              {type.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Blood group (optional; saved values cannot be cleared)
          <select className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3" value={bloodGroup} onChange={(event) => setBloodGroup(event.target.value as BloodGroup | "")}>
            <option value="">Not provided</option>{bloodGroups.map((group) => <option key={group}>{group}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">City<Input className="mt-1" value={city} onChange={(event) => setCity(event.target.value)} /></label>
          <label className="text-sm">State<Input className="mt-1" value={state} onChange={(event) => setState(event.target.value)} /></label>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} />
        Available for simulated matching
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input className="mt-1" type="checkbox" checked={consentGranted} onChange={(event) => setConsentGranted(event.target.checked)} />
        <span>I consent to my anonymous profile being used for simulated donor matching.</span>
      </label>
      <Button disabled={save.isPending || donationTypesSelected.length === 0 || !city.trim() || !state.trim()} onClick={() => saveProfile()}>
        {save.isPending ? "Saving…" : profile ? "Save donor profile" : "Register donor profile"}
      </Button>
      {save.isError ? <p role="alert" className="text-sm text-destructive">{getErrorMessage(save.error)}</p> : null}
      {save.isSuccess ? <p className="text-sm text-emerald-700">Profile saved. Matching will only include it while consent is granted.</p> : null}
    </div>
  );
}
