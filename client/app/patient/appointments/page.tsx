"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api/errors";
import { useAuth } from "@/features/auth/auth-provider";
import {
  useAppointments,
  useCreateAppointment,
  useDoctorAvailability,
  useDoctorDirectory,
  useUpdateAppointment,
} from "@/features/phase-four/hooks";

const today = () => new Date().toISOString().slice(0, 10);
const formatSlot = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })
    .format(new Date(value)) + " UTC";

export default function PatientAppointmentsPage() {
  const [specialty, setSpecialty] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [from, setFrom] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [reason, setReason] = useState("");
  const doctors = useDoctorDirectory(specialty);
  const availability = useDoctorAvailability(doctorId, from);
  const appointments = useAppointments();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const { user } = useAuth();
  const chosenDoctor = doctors.data?.items.find((doctor) => doctor.id === doctorId);

  const book = async () => {
    if (!selectedSlot) return;
    await createAppointment.mutateAsync({
      doctorId,
      scheduledAt: selectedSlot,
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    });
    setSelectedSlot("");
    setReason("");
  };

  return (
    <>
      <PageHeader title="Appointments" description="Browse verified doctors and request an available UTC 30-minute slot." />
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Find a doctor</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.5fr]">
          <label className="text-sm">
            Specialty
            <Input className="mt-1" value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="e.g. Cardiology" />
          </label>
          <label className="text-sm">
            Doctor
            <select
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={doctorId}
              onChange={(event) => { setDoctorId(event.target.value); setSelectedSlot(""); }}
            >
              <option value="">Select a verified doctor</option>
              {doctors.data?.items.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialties.join(", ")}</option>
              ))}
            </select>
          </label>
        </div>
        {doctors.isError ? <p role="alert" className="mt-3 text-sm text-destructive">{getErrorMessage(doctors.error)}</p> : null}
        {chosenDoctor ? (
          <div className="mt-4 rounded-lg bg-muted/50 p-4 text-sm">
            <p className="font-medium">{chosenDoctor.name}</p>
            <p className="mt-1 text-muted-foreground">{chosenDoctor.bio || "No profile biography provided."}</p>
            <p className="mt-1 text-muted-foreground">
              {chosenDoctor.yearsOfExperience === null ? "Experience not listed" : `${chosenDoctor.yearsOfExperience} years experience`}
              {chosenDoctor.consultationFee === null ? "" : ` · ₹${chosenDoctor.consultationFee}`}
            </p>
          </div>
        ) : null}
        {doctorId ? (
          <div className="mt-4">
            <label className="text-sm">
              Start date
              <Input type="date" className="mt-1 max-w-xs" value={from} min={today()} onChange={(event) => { setFrom(event.target.value); setSelectedSlot(""); }} />
            </label>
            {availability.isPending ? <p className="mt-4 text-sm text-muted-foreground">Loading available slots…</p> : null}
            {availability.isError ? <p role="alert" className="mt-4 text-sm text-destructive">{getErrorMessage(availability.error)}</p> : null}
            {availability.data ? (
              <>
                <p className="mt-4 text-sm font-medium">Available slots · UTC</p>
                {availability.data.availability.slots.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {availability.data.availability.slots.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        size="sm"
                        variant={selectedSlot === slot ? "default" : "outline"}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {formatSlot(slot)}
                      </Button>
                    ))}
                  </div>
                ) : <p className="mt-2 text-sm text-muted-foreground">No open times in this 14-day window.</p>}
              </>
            ) : null}
            {selectedSlot ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="text-sm">
                  Reason (optional)
                  <Textarea className="mt-1" rows={2} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
                </label>
                <Button type="button" disabled={createAppointment.isPending} onClick={() => void book()}>
                  {createAppointment.isPending ? "Requesting…" : "Request appointment"}
                </Button>
              </div>
            ) : null}
            {createAppointment.isError ? <p role="alert" className="mt-3 text-sm text-destructive">{getErrorMessage(createAppointment.error)}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Your appointments</h2>
        </div>
        {appointments.isPending ? <p className="p-5 text-sm text-muted-foreground">Loading appointments…</p> :
          appointments.isError ? <div className="p-5"><ErrorState error={appointments.error} onRetry={() => void appointments.refetch()} /></div> :
          appointments.data.items.length === 0 ? <EmptyState title="No appointments yet" description="Your requests will appear here." /> :
          <ul className="divide-y">
            {appointments.data.items.map((appointment) => (
              <li key={appointment.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{appointment.doctor.name}</p>
                  <p className="text-sm text-muted-foreground">{formatSlot(appointment.scheduledAt)} · {appointment.status.replace("_", " ")}</p>
                  {appointment.reason ? <p className="mt-1 text-sm">{appointment.reason}</p> : null}
                </div>
                {appointment.status === "requested" || appointment.status === "confirmed" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateAppointment.isPending}
                    onClick={() => updateAppointment.mutate({ id: appointment.id, status: "cancelled" })}
                  >
                    Cancel
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>}
        {updateAppointment.isError ? <p role="alert" className="px-5 pb-4 text-sm text-destructive">{getErrorMessage(updateAppointment.error)}</p> : null}
      </section>
      <p className="mt-3 text-xs text-muted-foreground">Signed in as {user?.firstName ?? "patient"}. Booking requests are prototype records; no external booking service is contacted.</p>
    </>
  );
}
