import {
  ClipboardList,
  CalendarDays,
  Building2,
  HeartPulse,
  LayoutDashboard,
  Siren,
  Stethoscope,
  ScrollText,
  ShieldPlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types/api";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Only routes that actually work are listed here. */
export const NAV: Record<Role, NavItem[]> = {
  patient: [
    { href: "/patient", label: "Overview", icon: LayoutDashboard },
    { href: "/patient/assessments", label: "My assessments", icon: ClipboardList },
    { href: "/patient/care-plans", label: "Care plans", icon: ShieldPlus },
    { href: "/patient/appointments", label: "Appointments", icon: CalendarDays },
    { href: "/patient/donors", label: "Donor availability", icon: HeartPulse },
    { href: "/patient/emergencies", label: "Emergency simulation", icon: Siren },
    { href: "/patient/facilities", label: "Facilities", icon: Building2 },
    { href: "/patient/profile", label: "My health profile", icon: UserRound },
  ],
  doctor: [
    { href: "/doctor", label: "Overview", icon: LayoutDashboard },
    { href: "/doctor/assessments", label: "Review queue", icon: ClipboardList },
    { href: "/doctor/second-opinions", label: "Second opinions", icon: ShieldPlus },
    { href: "/doctor/care-plans", label: "Care plans", icon: ScrollText },
    { href: "/doctor/appointments", label: "Appointments", icon: CalendarDays },
    { href: "/doctor/facilities", label: "Facilities", icon: Building2 },
    { href: "/doctor/profile", label: "Profile & credentials", icon: Stethoscope },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
    { href: "/admin/audit-logs", label: "Audit logs", icon: ScrollText },
    { href: "/admin/facilities", label: "Partner facilities", icon: Building2 },
    { href: "/admin/responders", label: "Responders", icon: Siren },
  ],
  partner: [
    { href: "/partner", label: "Overview", icon: ClipboardList },
    { href: "/partner/facilities", label: "My facilities", icon: Building2 },
  ],
  responder: [{ href: "/responder", label: "Emergency queue", icon: Siren }],
};
