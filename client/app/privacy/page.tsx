import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/common/logo";

export const metadata: Metadata = { title: "Privacy & limitations" };

const SECTIONS = [
  {
    title: "This is a prototype",
    body: "Magadh Ventures is a college/hackathon prototype. It must only be used with synthetic data. Do not enter real personal or medical information. It has not been clinically validated and is not a medical device or service.",
  },
  {
    title: "What we store",
    body: "Account details and the health profile you choose to provide: date of birth, gender, location, allergies, medications, medical history and your consent choices. Passwords are stored only as salted hashes.",
  },
  {
    title: "Who can see it",
    body: "You can see your own record. Doctors can see only cases they are authorised to review. Administrators have restricted access, and every administrative access to patient data is written to an audit log.",
  },
  {
    title: "AI limitations",
    body: "AI-generated output is informational only. It is not a diagnosis, it never prescribes medication, and it cannot rule out an emergency. A doctor's independent assessment is always stored separately and never overwrites the AI result.",
  },
  {
    title: "Simulated features",
    body: "Donor availability, ambulance status, arrival times and some notifications are simulated in this prototype. No real donor, responder, hospital or emergency service is contacted.",
  },
  {
    title: "Before any real deployment",
    body: "Applicable Indian privacy and healthcare requirements must be reviewed and a clinical safety review completed.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-card">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy & limitations</h1>
        <p className="mt-2 text-muted-foreground">How this prototype handles data, and what it can&apos;t do.</p>
        <div className="mt-10 space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
        <Link href="/" className="mt-12 inline-block text-sm font-medium text-primary hover:underline">← Back to home</Link>
      </main>
    </div>
  );
}
