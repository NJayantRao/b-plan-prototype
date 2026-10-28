import type { ReactNode } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { AssessmentSafety, ClinicalPriority } from "@/types/api";
import { formatDateTime } from "@/lib/format";

const priorityTone: Record<ClinicalPriority, string> = {
  routine: "bg-slate-100 text-slate-700",
  urgent: "bg-amber-100 text-amber-900",
  emergency: "bg-red-100 text-red-800",
};

export function PriorityBadge({ priority }: { priority: ClinicalPriority }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${priorityTone[priority]}`}>
      {priority}
    </span>
  );
}

export function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function SafetyNotice({ safety }: { safety: AssessmentSafety }) {
  const urgent = safety.level !== "none";
  return (
    <div
      role={urgent ? "alert" : "note"}
      className={`rounded-xl border p-4 ${safety.level === "emergency" ? "border-red-300 bg-red-50 text-red-950" : safety.level === "urgent" ? "border-amber-300 bg-amber-50 text-amber-950" : "border-slate-200 bg-slate-50 text-slate-800"}`}
    >
      <div className="flex gap-3">
        {urgent ? <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden /> : <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />}
        <div>
          <p className="font-semibold">
            {safety.level === "emergency" ? "Emergency warning signs detected" : safety.level === "urgent" ? "Prompt medical attention recommended" : "No urgent warning signs detected"}
          </p>
          <p className="mt-1 text-sm">{safety.advice}</p>
          {!safety.clinicallyReviewed ? (
            <p className="mt-2 text-xs font-medium">
              This prototype safety rule set has not been clinically reviewed. It cannot rule out an emergency.
            </p>
          ) : null}
          {safety.matches.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-sm">
              {safety.matches.map((match) => <li key={match.id}>{match.label}</li>)}
            </ul>
          ) : null}
          <p className="mt-2 text-xs opacity-75">Checked {formatDateTime(safety.evaluatedAt)} · rules {safety.rulesVersion}</p>
        </div>
      </div>
    </div>
  );
}

export function ClinicalDisclaimer() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      Prototype only. This service is not a medical service. AI-generated information is not a diagnosis or medical advice; seek urgent care if you feel seriously unwell.
    </p>
  );
}
