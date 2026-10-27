import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="doctor">{children}</DashboardShell>;
}
