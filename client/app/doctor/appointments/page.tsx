"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDoctorProfile, useUpdateDoctorProfile } from "@/features/doctors/hooks";
import { useAppointments, useUpdateAppointment } from "@/features/phase-four/hooks";
import { getErrorMessage } from "@/lib/api/errors";
import type { DoctorProfile } from "@/types/api";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const formatSlot = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })
    .format(new Date(value)) + " UTC";

export default function DoctorAppointmentsPage() {
  const profile = useDoctorProfile();
  const appointments = useAppointments(undefined, "doctor");
  const updateAppointment = useUpdateAppointment();
  const [now, setNow] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <PageHeader title="Appointments" description="Configure weekly UTC availability and manage appointment requests." />
      {profile.isPending ? <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">Loading doctor profile…</div> :
        profile.isError ? <ErrorState error={profile.error} onRetry={() => void profile.refetch()} /> :
        profile.data.verificationStatus !== "verified" ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            Your profile must be verified before appointment scheduling is available to patients.
          </div>
        ) : <AvailabilityEditor key={profile.data.updatedAt} profile={profile.data} />}

      <section className="mt-6 rounded-xl border bg-card">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Appointment requests</h2></div>
        {appointments.isPending ? <p className="p-5 text-sm text-muted-foreground">Loading appointments…</p> :
          appointments.isError ? <div className="p-5"><ErrorState error={appointments.error} onRetry={() => void appointments.refetch()} /></div> :
          appointments.data.items.length === 0 ? <EmptyState title="No appointment requests" /> :
          <ul className="divide-y">
            {appointments.data.items.map((appointment) => {
              const isFuture = now === 0 || new Date(appointment.scheduledAt).getTime() > now;
              return (
                <li key={appointment.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{appointment.patient.name}</p>
                    <p className="text-sm text-muted-foreground">{formatSlot(appointment.scheduledAt)} · {appointment.status.replace("_", " ")}</p>
                    {appointment.reason ? <p className="mt-1 text-sm">{appointment.reason}</p> : null}
                  </div>
                  {appointment.status === "requested" || appointment.status === "confirmed" ? (
                    <div className="flex gap-2">
                      {appointment.status === "requested" ? (
                        <Button size="sm" disabled={updateAppointment.isPending} onClick={() => updateAppointment.mutate({ id: appointment.id, status: "confirmed" })}>Confirm</Button>
                      ) : null}
                      {appointment.status === "confirmed" && !isFuture ? (
                        <Button size="sm" disabled={updateAppointment.isPending} onClick={() => updateAppointment.mutate({ id: appointment.id, status: "completed" })}>Mark complete</Button>
                      ) : null}
                      <Button size="sm" variant="outline" disabled={updateAppointment.isPending} onClick={() => updateAppointment.mutate({ id: appointment.id, status: "cancelled" })}>Cancel</Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>}
        {updateAppointment.isError ? <p role="alert" className="px-5 pb-4 text-sm text-destructive">{getErrorMessage(updateAppointment.error)}</p> : null}
      </section>
    </>
  );
}

function AvailabilityEditor({ profile }: { profile: DoctorProfile }) {
  const update = useUpdateDoctorProfile();
  const initial = DAYS.map((_, dayOfWeek) => {
    const saved = profile.weeklyAvailability.find((entry) => entry.dayOfWeek === dayOfWeek);
    return {
      enabled: Boolean(saved),
      startTime: saved?.startTime ?? "09:00",
      endTime: saved?.endTime ?? "17:00",
    };
  });
  const [schedule, setSchedule] = useState(initial);
  const save = () => update.mutate({
    weeklyAvailability: schedule.flatMap((day, dayOfWeek) =>
      day.enabled ? [{ dayOfWeek, startTime: day.startTime, endTime: day.endTime }] : [],
    ),
  });

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">Weekly availability</h2>
        <p className="mt-1 text-sm text-muted-foreground">Times are UTC. Each window is split into 30-minute slots.</p>
      </div>
      <div className="space-y-3 p-5">
        {schedule.map((day, dayOfWeek) => (
          <div key={DAYS[dayOfWeek]} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr] sm:items-center">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(event) => setSchedule((current) => current.map((item, index) =>
                  index === dayOfWeek ? { ...item, enabled: event.target.checked } : item,
                ))}
              />
              {DAYS[dayOfWeek]}
            </label>
            <label className="text-xs text-muted-foreground">Start
              <Input type="time" step={1800} className="mt-1" disabled={!day.enabled} value={day.startTime} onChange={(event) => setSchedule((current) => current.map((item, index) =>
                index === dayOfWeek ? { ...item, startTime: event.target.value } : item,
              ))} />
            </label>
            <label className="text-xs text-muted-foreground">End
              <Input type="time" step={1800} className="mt-1" disabled={!day.enabled} value={day.endTime} onChange={(event) => setSchedule((current) => current.map((item, index) =>
                index === dayOfWeek ? { ...item, endTime: event.target.value } : item,
              ))} />
            </label>
          </div>
        ))}
        <Button disabled={update.isPending} onClick={() => save()}>{update.isPending ? "Saving…" : "Save weekly availability"}</Button>
        {update.isError ? <p role="alert" className="text-sm text-destructive">{getErrorMessage(update.error)}</p> : null}
        {update.isSuccess ? <p className="text-sm text-emerald-700">Availability saved.</p> : null}
      </div>
    </section>
  );
}
