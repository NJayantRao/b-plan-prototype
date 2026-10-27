import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="patient">{children}</DashboardShell>;
}
