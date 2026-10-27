import { cn } from "cn";
import type { AccountStatus, AuditOutcome, VerificationStatus } from "@/types/api";

type Tone = "green" | "amber" | "red" | "grey" | "blue";

const TONES: Record<Tone, { pill: string; dot: string }> = {
  green: { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  amber: { pill: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  red: { pill: "bg-red-50 text-red-700", dot: "bg-red-500" },
  grey: { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  blue: { pill: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
};

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        t.pill,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", t.dot)} aria-hidden />
      {children}
    </span>
  );
}

const VERIFICATION: Record<VerificationStatus, { tone: Tone; label: string }> = {
  verified: { tone: "green", label: "Verified" },
  pending: { tone: "amber", label: "Pending review" },
  rejected: { tone: "red", label: "Rejected" },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const { tone, label } = VERIFICATION[status];
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

const OUTCOME: Record<AuditOutcome, { tone: Tone; label: string }> = {
  success: { tone: "green", label: "Success" },
  failure: { tone: "red", label: "Failure" },
  denied: { tone: "amber", label: "Denied" },
};

export function OutcomeBadge({ outcome }: { outcome: AuditOutcome }) {
  const { tone, label } = OUTCOME[outcome];
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

export function AccountBadge({ status }: { status: AccountStatus }) {
  return status === "active" ? (
    <StatusPill tone="green">Active</StatusPill>
  ) : (
    <StatusPill tone="grey">Suspended</StatusPill>
  );
}
