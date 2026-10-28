"use client";

import { ArrowRight, Check, Circle } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { CardSkeleton, ErrorState } from "@/components/common/states";
import { StatusPill } from "@/components/common/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { usePatientProfile } from "@/features/patients/hooks";
import { profileChecklist } from "@/features/patients/schemas";
import { cn } from "cn";

const JOURNEY = [
  { title: "Symptom check", text: "Describe your symptoms and submit them for doctor review.", href: "/patient/assessments", link: "Start an assessment" },
  { title: "Doctor review", text: "Follow your case and read verified-doctor findings.", href: "/patient/assessments", link: "View assessments" },
  { title: "Second opinion", text: "Request another doctor after the first review.", href: "/patient/assessments", link: "Review your cases" },
  { title: "Care plan", text: "Track tasks and follow-up recommendations.", href: "/patient/care-plans", link: "View care plans" },
];

export default function PatientOverviewPage() {
  const { user } = useAuth();
  const { data, isPending, isError, error, refetch } = usePatientProfile();

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.firstName ?? ""}`}
        description="Keep your health profile up to date so doctors have the right context."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {isPending ? (
            <CardSkeleton lines={4} />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your profile" />
          ) : (
            <ProfileCompleteness profile={data.profile} />
          )}
        </div>

        <section className="rounded-xl border bg-card lg:col-span-2">
          <div className="border-b px-5 py-4">
            <h2 className="text-[15px] font-semibold">Account</h2>
          </div>
          <dl className="space-y-3 p-5 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{user ? `${user.firstName} ${user.lastName}` : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium break-all">{user?.email}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="mt-6 rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-[15px] font-semibold">Your care journey</h2>
          <StatusPill tone="green">Available</StatusPill>
        </div>
        <ol className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {JOURNEY.map((step, index) => (
            <li key={step.title} className="bg-card p-5">
              <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-medium">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
              <Link href={step.href} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                {step.link}<ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function ProfileCompleteness({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof usePatientProfile>["data"]>["profile"];
}) {
  const { items, done, total, percent } = profileChecklist(profile);
  const complete = done === total;

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="text-[15px] font-semibold">Profile completeness</h2>
        <span className="text-sm text-muted-foreground">{done} of {total}</span>
      </div>
      <div className="p-5">
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completeness"
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
        <ul className="mt-5 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 text-sm">
              {item.done ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="size-3" aria-hidden />
                </span>
              ) : (
                <Circle className="size-5 text-muted-foreground/50" aria-hidden />
              )}
              <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              <span className="sr-only">{item.done ? "completed" : "not completed"}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/patient/profile"
          className={cn(buttonVariants({ size: "lg" }), "mt-6 h-9")}
        >
          {complete ? "Review your profile" : "Complete your profile"}
          <ArrowRight data-icon="inline-end" />
        </Link>
      </div>
    </section>
  );
}
