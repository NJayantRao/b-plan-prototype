"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api/errors";
import { toast } from "@/components/ui/toast";
import type { ClinicalDurationUnit, ClinicalSeverity } from "@/types/api";
import { useCreateAssessment } from "./hooks";

interface SymptomForm {
  name: string;
  severity: ClinicalSeverity;
  durationValue: string;
  durationUnit: ClinicalDurationUnit;
}

const emptySymptom = (): SymptomForm => ({
  name: "",
  severity: "moderate",
  durationValue: "1",
  durationUnit: "days",
});

export function AssessmentForm({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
  const [symptoms, setSymptoms] = useState<SymptomForm[]>([emptySymptom()]);
  const [description, setDescription] = useState("");
  const mutation = useCreateAssessment();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    try {
      const assessment = await mutation.mutateAsync({
        symptoms: symptoms.map((symptom) => ({
          name: symptom.name.trim(),
          severity: symptom.severity,
          duration: { value: Number(symptom.durationValue), unit: symptom.durationUnit },
        })),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setSymptoms([emptySymptom()]);
      setDescription("");
      toast.add({
        type: "success",
        title: "Assessment submitted",
        description: assessment.ai.status === "completed" ? "Your case is in the doctor review queue." : "Your case is saved for doctor review.",
      });
      router.push(`/patient/assessments/${assessment.id}`);
    } catch (error) {
      toast.add({ type: "error", title: "Couldn't submit assessment", description: getErrorMessage(error) });
    }
  };

  const updateSymptom = (index: number, patch: Partial<SymptomForm>) =>
    setSymptoms((current) => current.map((symptom, i) => i === index ? { ...symptom, ...patch } : symptom));

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-3">
        {symptoms.map((symptom, index) => (
          <fieldset key={index} className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <legend className="px-1 text-sm font-medium">Symptom {index + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto]">
              <label className="space-y-1 text-sm">
                <span>Symptom</span>
                <Input value={symptom.name} maxLength={100} required placeholder="e.g. Headache" onChange={(e) => updateSymptom(index, { name: e.target.value })} />
              </label>
              <label className="space-y-1 text-sm">
                <span>Severity</span>
                <select className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm" value={symptom.severity} onChange={(e) => updateSymptom(index, { severity: e.target.value as ClinicalSeverity })}>
                  <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span>Duration</span>
                <Input type="number" min={1} max={1000} step={1} required value={symptom.durationValue} onChange={(e) => updateSymptom(index, { durationValue: e.target.value })} />
              </label>
              <label className="space-y-1 text-sm">
                <span>Unit</span>
                <select className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm" value={symptom.durationUnit} onChange={(e) => updateSymptom(index, { durationUnit: e.target.value as ClinicalDurationUnit })}>
                  <option value="hours">Hours</option><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option>
                </select>
              </label>
              <Button type="button" variant="ghost" size="icon" className="self-end" aria-label={`Remove symptom ${index + 1}`} disabled={symptoms.length === 1} onClick={() => setSymptoms((current) => current.filter((_, i) => i !== index))}>
                <Trash2 aria-hidden />
              </Button>
            </div>
          </fieldset>
        ))}
        <Button type="button" variant="outline" disabled={symptoms.length >= 10} onClick={() => setSymptoms((current) => [...current, emptySymptom()])}>
          <Plus data-icon="inline-start" /> Add symptom
        </Button>
      </div>
      <label className="block space-y-1 text-sm">
        <span>Anything else you want the doctor to know <span className="text-muted-foreground">(optional)</span></span>
        <Textarea rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When did this start? What makes it better or worse?" />
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
          Your symptoms and selected health-profile context will be shared with the reviewing doctor. AI analysis may take up to two minutes; a doctor review is still required.
        </p>
        <Button type="submit" disabled={disabled || mutation.isPending}>
          {mutation.isPending ? "Submitting…" : disabled ? "Enable AI assessment consent to continue" : "Submit for doctor review"}
        </Button>
      </div>
    </form>
  );
}
