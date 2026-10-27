import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function ResponderLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="responder">{children}</DashboardShell>;
}
