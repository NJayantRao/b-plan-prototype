import type { Role } from "@/types/api";

export const ROLE_HOME: Record<Role, string> = {
  patient: "/patient",
  doctor: "/doctor",
  admin: "/admin",
  partner: "/partner",
  responder: "/responder",
};

export const ROLE_LABEL: Record<Role, string> = {
  patient: "Patient",
  doctor: "Doctor",
  admin: "Administrator",
  partner: "Partner",
  responder: "Responder",
};

/**
 * Validates a post-login redirect target. Only same-site paths inside the
 * user's own area are allowed, which also prevents open redirects
 * (e.g. `//evil.com` or `https://evil.com`).
 */
export const safeNextPath = (next: string | null | undefined, role: Role): string => {
  const home = ROLE_HOME[role];
  if (
    next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("\\") &&
    (next === home || next.startsWith(`${home}/`))
  ) {
    return next;
  }
  return home;
};
