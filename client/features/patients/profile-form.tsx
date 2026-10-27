"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, type ReactNode } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { SelectField, TextField, TextareaField } from "@/components/form/text-field";
import { TagInput } from "@/components/form/tag-input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { toApiError } from "@/lib/api/errors";
import { applyServerFieldErrors, describeError } from "@/lib/form";
import type { PatientProfile } from "@/types/api";
import { useUpdatePatientProfile } from "./hooks";
import {
  CONSENT_OPTIONS,
  GENDER_OPTIONS,
  formToPayload,
  profileFormSchema,
  profileToForm,
  type ProfileFormValues,
} from "./schemas";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
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

// Server field names -> form field names (the form keeps location flat).
const SERVER_FIELD_MAP: Record<string, string> = {
  "location.city": "city",
  "location.state": "state",
  "location.country": "country",
  "location.pincode": "pincode",
};

export function PatientProfileForm({ profile }: { profile: PatientProfile }) {
  const mutation = useUpdatePatientProfile();
  const initial = useMemo(() => profileToForm(profile), [profile]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: initial,
  });

  // Re-sync when fresh data arrives (after a save or a refetch).
  useEffect(() => reset(initial), [initial, reset]);

  const meds = useFieldArray({ control, name: "currentMedications" });
  const history = useFieldArray({ control, name: "medicalHistory" });

  const onSubmit = handleSubmit(async (values) => {
    const payload = formToPayload(values, initial);
    if (Object.keys(payload).length === 0) {
      toast.add({ type: "info", title: "Nothing to save", description: "You haven't changed anything." });
      return;
    }
    try {
      await mutation.mutateAsync(payload);
      toast.add({ type: "success", title: "Profile saved" });
    } catch (error) {
      const apiError = toApiError(error);
      const applied = applyServerFieldErrors(
        apiError,
        setError,
        ["dateOfBirth", "gender", "city", "state", "country", "pincode"],
        SERVER_FIELD_MAP,
      );
      toast.add({
        type: "error",
        title: "Couldn't save your profile",
        description: applied ? "Please fix the highlighted fields." : describeError(apiError),
      });
    }
  });

  const saving = mutation.isPending;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 pb-24">
      <Section title="Personal details" description="Used to give doctors the right context. Share only what you're comfortable with.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Date of birth" type="date" optional max={new Date().toISOString().slice(0, 10)} error={errors.dateOfBirth?.message} {...register("dateOfBirth")} />
          <SelectField label="Gender" optional error={errors.gender?.message} {...register("gender")}>
            <option value="">Not specified</option>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </SelectField>
        </div>
      </Section>

      <Section title="Location" description="Helps with nearby doctors, donors and emergency coordination. A city is enough.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="City" optional error={errors.city?.message} {...register("city")} />
          <TextField label="State" optional error={errors.state?.message} {...register("state")} />
          <TextField label="Country code" optional maxLength={2} description="2 letters, e.g. IN" error={errors.country?.message} {...register("country")} />
          <TextField label="PIN code" optional error={errors.pincode?.message} {...register("pincode")} />
        </div>
      </Section>

      <Section title="Allergies" description="Type an allergy and press Enter. Leave empty if you have none.">
        <Controller
          control={control}
          name="allergies"
          render={({ field }) => (
            <TagInput label="Known allergies" value={field.value} onChange={field.onChange} placeholder="e.g. Penicillin" error={errors.allergies?.message} />
          )}
        />
      </Section>

      <Section title="Current medications">
        {meds.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medications added.</p>
        ) : null}
        {meds.fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-start">
            <TextField label="Medication" error={errors.currentMedications?.[index]?.name?.message} {...register(`currentMedications.${index}.name`)} />
            <TextField label="Dosage" optional error={errors.currentMedications?.[index]?.dosage?.message} {...register(`currentMedications.${index}.dosage`)} />
            <TextField label="Frequency" optional error={errors.currentMedications?.[index]?.frequency?.message} {...register(`currentMedications.${index}.frequency`)} />
            <Button type="button" variant="ghost" size="icon" className="sm:mt-6" aria-label={`Remove medication ${index + 1}`} onClick={() => meds.remove(index)}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" disabled={meds.fields.length >= 50} onClick={() => meds.append({ name: "", dosage: "", frequency: "" })}>
          <Plus data-icon="inline-start" /> Add medication
        </Button>
      </Section>

      <Section title="Medical history" description="Existing conditions and past diagnoses.">
        {history.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conditions added.</p>
        ) : null}
        {history.fields.map((field, index) => (
          <div key={field.id} className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="grid gap-3 sm:grid-cols-[1.6fr_0.6fr_auto] sm:items-start">
              <TextField label="Condition" error={errors.medicalHistory?.[index]?.condition?.message} {...register(`medicalHistory.${index}.condition`)} />
              <TextField label="Year" optional inputMode="numeric" maxLength={4} error={errors.medicalHistory?.[index]?.diagnosedYear?.message} {...register(`medicalHistory.${index}.diagnosedYear`)} />
              <Button type="button" variant="ghost" size="icon" className="sm:mt-6" aria-label={`Remove condition ${index + 1}`} onClick={() => history.remove(index)}>
                <Trash2 />
              </Button>
            </div>
            <TextareaField label="Notes" optional rows={2} error={errors.medicalHistory?.[index]?.notes?.message} {...register(`medicalHistory.${index}.notes`)} />
          </div>
        ))}
        <Button type="button" variant="outline" disabled={history.fields.length >= 100} onClick={() => history.append({ condition: "", diagnosedYear: "", notes: "" })}>
          <Plus data-icon="inline-start" /> Add condition
        </Button>
      </Section>

      <Section title="Consents" description="You can change these at any time. Changes are recorded with a timestamp.">
        <div className="divide-y rounded-lg border">
          {CONSENT_OPTIONS.map((option) => (
            <Controller
              key={option.type}
              control={control}
              name={`consents.${option.type}`}
              render={({ field }) => (
                <div className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <p id={`consent-${option.type}`} className="text-sm font-medium">{option.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                    aria-labelledby={`consent-${option.type}`}
                  />
                </div>
              )}
            />
          ))}
        </div>
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
  );
}
