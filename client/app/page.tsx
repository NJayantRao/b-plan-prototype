import {
  ClipboardCheck,
  HeartHandshake,
  MessageSquareText,
  ShieldCheck,
  Siren,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { AuthCta } from "@/components/common/auth-cta";
import { Logo } from "@/components/common/logo";

const FEATURES = [
  { icon: MessageSquareText, title: "AI-assisted symptom check", text: "Describe symptoms and get a structured summary with missing-information prompts. Never a diagnosis." },
  { icon: Stethoscope, title: "Doctor review", text: "Verified doctors record independent findings, stored separately from the AI output." },
  { icon: ShieldCheck, title: "Second opinions", text: "Compare AI and doctor assessments side by side and escalate when they differ." },
  { icon: ClipboardCheck, title: "Care plans & follow-up", text: "Tasks, referrals and reminders so care doesn't end at the consultation." },
  { icon: HeartHandshake, title: "Donor network", text: "Register consented blood donation availability and request anonymous synthetic matches." },
  { icon: Siren, title: "Emergency coordination", text: "Request help and track a responder. Simulated in this prototype." },
];

const STEPS = [
  "Create a patient profile",
  "Describe your symptoms",
  "A doctor reviews independently",
  "Follow your care plan",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-card">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <AuthCta />
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            Hackathon prototype · synthetic demo data
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Healthcare coordination, from first symptom to follow-up.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Patients, doctors, donors and responders on one platform. AI assists. Doctors decide.
          </p>
          <AuthCta size="lg" className="mt-8" />
        </section>

        <section className="border-y bg-background">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">What the platform does</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-xl border bg-card p-5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <feature.icon className="size-[18px]" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-medium">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="pt-1 text-sm font-medium">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t bg-sidebar text-sidebar-foreground">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
            <div>
              <h3 className="font-medium text-white">Privacy first</h3>
              <p className="mt-2 text-sm leading-relaxed">Only you and clinicians authorised to review your case can see your records. Administrative access is restricted and audited.</p>
            </div>
            <div>
              <h3 className="font-medium text-white">AI has limits</h3>
              <p className="mt-2 text-sm leading-relaxed">AI output is informational. It is not a diagnosis, does not prescribe, and cannot rule out an emergency.</p>
            </div>
            <div>
              <h3 className="font-medium text-white">In an emergency</h3>
              <p className="mt-2 text-sm leading-relaxed">Contact local emergency services immediately. Do not rely on this prototype for urgent care.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>Magadh Ventures · Prototype, not a medical service.</p>
          <Link href="/privacy" className="hover:text-foreground">Privacy & limitations</Link>
        </div>
      </footer>
    </div>
  );
}
