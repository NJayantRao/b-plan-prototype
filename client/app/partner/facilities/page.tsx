"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api/errors";
import { useCreateFacility, useFacilities } from "@/features/phase-four/hooks";
import type { FacilityType } from "@/features/phase-four/api";

const types: FacilityType[] = ["hospital", "clinic", "diagnostic_center", "blood_bank", "other"];

export default function PartnerFacilitiesPage() {
  const facilities = useFacilities("partner");
  const create = useCreateFacility();
  const [name, setName] = useState("");
  const [type, setType] = useState<FacilityType>("clinic");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("IN");
  const [pincode, setPincode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [services, setServices] = useState("");

  const submit = async () => {
    await create.mutateAsync({
      name: name.trim(),
      type,
      address: { city: city.trim(), state: state.trim(), country: country.trim().toUpperCase(), ...(pincode.trim() ? { pincode: pincode.trim() } : {}) },
      supportedServices: services.split(",").map((service) => service.trim()).filter(Boolean),
      ...(contactPhone.trim() ? { contactPhone: contactPhone.trim() } : {}),
      ...(contactEmail.trim() ? { contactEmail: contactEmail.trim() } : {}),
    });
    setName("");
    setServices("");
    void facilities.refetch();
  };

  return (
    <>
      <PageHeader title="My facilities" description="Submit a facility for administrator verification and track its directory status." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Submit facility</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">Facility name<Input className="mt-1" maxLength={150} value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="block text-sm">Type
              <select className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3" value={type} onChange={(event) => setType(event.target.value as FacilityType)}>
                {types.map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">City<Input className="mt-1" value={city} onChange={(event) => setCity(event.target.value)} /></label>
              <label className="text-sm">State<Input className="mt-1" value={state} onChange={(event) => setState(event.target.value)} /></label>
              <label className="text-sm">Country code<Input className="mt-1" maxLength={2} value={country} onChange={(event) => setCountry(event.target.value)} /></label>
              <label className="text-sm">Postal code (optional)<Input className="mt-1" value={pincode} onChange={(event) => setPincode(event.target.value)} /></label>
            </div>
            <label className="block text-sm">Services (comma-separated)<Input className="mt-1" value={services} onChange={(event) => setServices(event.target.value)} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Contact phone (optional)<Input className="mt-1" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} /></label>
              <label className="text-sm">Contact email (optional)<Input type="email" className="mt-1" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /></label>
            </div>
            <Button disabled={create.isPending || !name.trim() || !city.trim() || !state.trim() || country.trim().length !== 2} onClick={() => void submit()}>
              {create.isPending ? "Submitting…" : "Submit for verification"}
            </Button>
            {create.isError ? <p role="alert" className="text-sm text-destructive">{getErrorMessage(create.error)}</p> : null}
          </div>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="border-b px-5 py-4"><h2 className="font-semibold">Submitted facilities</h2></div>
          {facilities.isPending ? <p className="p-5 text-sm text-muted-foreground">Loading facilities…</p> :
            facilities.isError ? <div className="p-5"><ErrorState error={facilities.error} onRetry={() => void facilities.refetch()} /></div> :
            facilities.data.items.length === 0 ? <EmptyState title="No facility submissions" description="Submitted facilities will appear here." /> :
            <ul className="divide-y">
              {facilities.data.items.map((facility) => (
                <li key={facility.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-medium">{facility.name}</p><p className="text-sm text-muted-foreground">{facility.type.replace("_", " ")} · {facility.address.city}, {facility.address.state}</p></div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">{facility.verificationStatus}</span>
                  </div>
                  {facility.verification?.notes ? <p className="mt-2 text-sm text-muted-foreground">Review note: {facility.verification.notes}</p> : null}
                </li>
              ))}
            </ul>}
        </section>
      </div>
    </>
  );
}
