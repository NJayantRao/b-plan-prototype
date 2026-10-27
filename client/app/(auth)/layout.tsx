import { Suspense } from "react";
import { GuestGuard } from "@/components/auth/guest-guard";
import { Logo } from "@/components/common/logo";
import { FullPageSpinner } from "@/components/common/states";

const POINTS = [
  "AI-assisted symptom assessment, always reviewed by a doctor",
  "Independent doctor findings, side by side with the AI output",
  "Second opinions, care plans and follow-up in one place",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col bg-card px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {/* useSearchParams (inside GuestGuard) needs a Suspense boundary. */}
          <Suspense fallback={<FullPageSpinner />}>
            <GuestGuard>{children}</GuestGuard>
          </Suspense>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Prototype for demonstration. Uses synthetic data only.
        </p>
      </div>

      <aside className="hidden flex-col justify-center bg-sidebar px-14 text-sidebar-foreground lg:flex">
        <h2 className="max-w-md text-3xl font-semibold tracking-tight text-white">
          Coordinated care, from first symptom to follow-up.
        </h2>
        <ul className="mt-8 max-w-md space-y-4 text-[15px] leading-relaxed">
          {POINTS.map((point) => (
            <li key={point} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sidebar-primary" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
        <p className="mt-10 max-w-md border-t border-sidebar-border pt-6 text-xs leading-relaxed text-sidebar-foreground/70">
          AI output is informational and is not a diagnosis. In an emergency, contact
          local emergency services immediately.
        </p>
      </aside>
    </div>
  );
}
