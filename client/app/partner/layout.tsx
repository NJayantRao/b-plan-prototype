import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="partner">{children}</DashboardShell>;
}
