"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { TagInput } from "@/components/form/tag-input";
import { TextField, TextareaField } from "@/components/form/text-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { toApiError } from "@/lib/api/errors";
import { applyServerFieldErrors, describeError } from "@/lib/form";
import type { DoctorProfile } from "@/types/api";
import type { UpdateDoctorProfilePayload } from "./api";
import { useUpdateDoctorProfile } from "./hooks";
import {
  doctorFormSchema,
  doctorFormToPayload,
  doctorToForm,
  findClearedFields,
  type DoctorFormValues,
} from "./schemas";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function DoctorProfileForm({ profile }: { profile: DoctorProfile }) {
  const mutation = useUpdateDoctorProfile();
  const initial = useMemo(() => doctorToForm(profile), [profile]);
  const [confirmPayload, setConfirmPayload] = useState<UpdateDoctorProfilePayload | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: initial,
  });
  useEffect(() => reset(initial), [initial, reset]);

  const quals = useFieldArray({ control, name: "qualifications" });

  const save = async (payload: UpdateDoctorProfilePayload) => {
    try {
      await mutation.mutateAsync(payload);
      toast.add({ type: "success", title: "Profile saved" });
    } catch (error) {
      const apiError = toApiError(error);
      const applied = applyServerFieldErrors(
        apiError,
        setError,
        ["licenseNumber", "registrationCouncil", "yearsOfExperience", "consultationFee", "bio"],
      );
      toast.add({
        type: "error",
        title: "Couldn't save your profile",
        description: applied ? "Please fix the highlighted fields." : describeError(apiError),
      });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    // The API can change these fields but not blank them: say so up front.
    const cleared = findClearedFields(values, initial);
    if (cleared.length > 0) {
      for (const field of cleared) {
        setError(field, { type: "manual", message: "This can be changed but not cleared. Enter a new value." });
      }
      return;
    }

    const payload = doctorFormToPayload(values, initial);
    if (Object.keys(payload).length === 0) {
      toast.add({ type: "info", title: "Nothing to save", description: "You haven't changed anything." });
      return;
    }

    // Changing the licence of a verified doctor sends them back to review.
    const resetsVerification =
      profile.verificationStatus === "verified" &&
      payload.licenseNumber !== undefined &&
      payload.licenseNumber !== profile.licenseNumber;
    if (resetsVerification) {
      setConfirmPayload(payload);
      return;
    }
    await save(payload);
  });

  const saving = mutation.isPending;

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-6 pb-24">
        <Section title="Credentials" description="Your licence is checked by an administrator before clinical features unlock.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Medical licence number" error={errors.licenseNumber?.message} {...register("licenseNumber")} />
            <TextField label="Registration council" optional error={errors.registrationCouncil?.message} {...register("registrationCouncil")} />
          </div>
          {profile.verificationStatus === "verified" ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Changing your licence number will send your profile back for administrator review.
            </p>
          ) : null}
        </Section>

        <Section title="Practice">
          <Controller
            control={control}
            name="specialties"
            render={({ field }) => (
              <TagInput label="Specialties" value={field.value} onChange={field.onChange} max={10} placeholder="e.g. General Medicine" error={errors.specialties?.message} />
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Years of experience" optional inputMode="numeric" error={errors.yearsOfExperience?.message} {...register("yearsOfExperience")} />
            <TextField label="Consultation fee (₹)" optional inputMode="decimal" error={errors.consultationFee?.message} {...register("consultationFee")} />
          </div>
          <TextareaField label="About you" optional rows={4} description="Shown to patients choosing a doctor." error={errors.bio?.message} {...register("bio")} />
        </Section>

        <Section title="Qualifications">
          {quals.fields.length === 0 ? <p className="text-sm text-muted-foreground">No qualifications added.</p> : null}
          {quals.fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_1.4fr_0.5fr_auto] sm:items-start">
              <TextField label="Degree" error={errors.qualifications?.[index]?.degree?.message} {...register(`qualifications.${index}.degree`)} />
              <TextField label="Institution" optional error={errors.qualifications?.[index]?.institution?.message} {...register(`qualifications.${index}.institution`)} />
              <TextField label="Year" optional inputMode="numeric" maxLength={4} error={errors.qualifications?.[index]?.year?.message} {...register(`qualifications.${index}.year`)} />
              <Button type="button" variant="ghost" size="icon" className="sm:mt-6" aria-label={`Remove qualification ${index + 1}`} onClick={() => quals.remove(index)}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" disabled={quals.fields.length >= 20} onClick={() => quals.append({ degree: "", institution: "", year: "" })}>
            <Plus data-icon="inline-start" /> Add qualification
          </Button>
        </Section>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur lg:left-60">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {isDirty ? "You have unsaved changes" : "All changes saved"}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" className="h-9" disabled={!isDirty || saving} onClick={() => reset(initial)}>
                Discard
              </Button>
              <Button type="submit" size="lg" className="h-9" disabled={!isDirty || saving}>
                {saving ? <Spinner /> : null}
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <AlertDialog open={confirmPayload !== null} onOpenChange={(open) => { if (!open) setConfirmPayload(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change your licence number?</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile is currently verified. Changing the licence number sends it back to an
              administrator for review, and clinical features stay locked until it is verified again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current licence</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const payload = confirmPayload;
                setConfirmPayload(null);
                if (payload) void save(payload);
              }}
            >
              Change and resubmit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
