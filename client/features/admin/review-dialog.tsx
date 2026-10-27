"use client";

import { useState } from "react";
import { VerificationBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { describeError } from "@/lib/form";
import { fullName } from "@/lib/format";
import type { AdminDoctorRow, VerificationStatus } from "@/types/api";
import { cn } from "cn";
import { useSetDoctorVerification } from "./hooks";

const DECISIONS: {
  status: VerificationStatus;
  label: string;
  hint: string;
  success: string;
}[] = [
  { status: "verified", label: "Verify", hint: "Grants access to clinical features.", success: "Doctor verified" },
  { status: "rejected", label: "Reject", hint: "Keeps clinical features locked. The note is shown to the doctor.", success: "Doctor rejected" },
  { status: "pending", label: "Reset to pending", hint: "Returns the profile to the review queue.", success: "Reset to pending" },
];

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

/** Rendered only while a doctor is selected (keyed by doctor), so state resets per review. */
function ReviewForm({ doctor, onClose }: { doctor: AdminDoctorRow; onClose: () => void }) {
  const mutation = useSetDoctorVerification();
  const options = DECISIONS.filter((d) => d.status !== doctor.verificationStatus);
  const [decision, setDecision] = useState<VerificationStatus>(
    doctor.verificationStatus === "pending" ? "verified" : (options[0]?.status ?? "pending"),
  );
  const [notes, setNotes] = useState("");

  const name = doctor.user ? fullName(doctor.user.firstName, doctor.user.lastName) : "Doctor";
  const missingLicence = decision === "verified" && !doctor.licenseNumber;
  const notesTooLong = notes.length > 500;

  const submit = async () => {
    try {
      await mutation.mutateAsync({ doctorId: doctor.userId, status: decision, ...(notes.trim() ? { notes: notes.trim() } : {}) });
      toast.add({ type: "success", title: DECISIONS.find((d) => d.status === decision)?.success ?? "Updated", description: name });
      onClose();
    } catch (error) {
      toast.add({ type: "error", title: "Couldn't update verification", description: describeError(error) });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Review {name}</DialogTitle>
        <DialogDescription>Check the credentials, then choose an outcome. This action is recorded in the audit log.</DialogDescription>
      </DialogHeader>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border bg-muted/40 p-4">
        <Detail label="Email">{doctor.user?.email ?? "—"}</Detail>
        <Detail label="Current status"><VerificationBadge status={doctor.verificationStatus} /></Detail>
        <Detail label="Licence number">{doctor.licenseNumber ?? <span className="text-red-700">Not provided</span>}</Detail>
        <Detail label="Council">{doctor.registrationCouncil ?? "—"}</Detail>
        <Detail label="Specialties">{doctor.specialties.length ? doctor.specialties.join(", ") : "—"}</Detail>
        <Detail label="Experience">{doctor.yearsOfExperience !== null ? `${doctor.yearsOfExperience} years` : "—"}</Detail>
        <div className="col-span-2">
          <dt className="text-xs text-muted-foreground">Qualifications</dt>
          <dd className="mt-0.5 text-sm font-medium">
            {doctor.qualifications.length
              ? doctor.qualifications.map((q) => [q.degree, q.institution, q.year].filter(Boolean).join(", ")).join(" · ")
              : "—"}
          </dd>
        </div>
      </dl>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-[13px] font-medium">Decision</legend>
        {options.map((option) => (
          <label
            key={option.status}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              decision === option.status ? "border-primary bg-accent/50" : "hover:bg-muted/50",
            )}
          >
            <input
              type="radio"
              name="decision"
              className="mt-0.5 accent-[var(--primary)]"
              checked={decision === option.status}
              onChange={() => setDecision(option.status)}
            />
            <span>
              <span className="block font-medium">{option.label}</span>
              <span className="block text-muted-foreground">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="review-notes" className="text-[13px] font-medium">
          Note <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="review-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          aria-invalid={notesTooLong || undefined}
          className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
        />
        <p className={cn("text-right text-xs", notesTooLong ? "text-destructive" : "text-muted-foreground")}>
          {notes.length}/500
        </p>
      </div>

      {missingLicence ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          This doctor hasn&apos;t submitted a licence number, so they can&apos;t be verified yet.
        </p>
      ) : null}

      <DialogFooter>
        <Button variant="outline" size="lg" className="h-9" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          size="lg"
          className="h-9"
          variant={decision === "rejected" ? "destructive" : "default"}
          disabled={missingLicence || notesTooLong || mutation.isPending}
          onClick={() => void submit()}
        >
          {mutation.isPending ? <Spinner /> : null}
          {DECISIONS.find((d) => d.status === decision)?.label}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ReviewDialog({ doctor, onClose }: { doctor: AdminDoctorRow | null; onClose: () => void }) {
  return (
    <Dialog open={doctor !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-lg">
        {doctor ? <ReviewForm key={doctor.userId} doctor={doctor} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}
