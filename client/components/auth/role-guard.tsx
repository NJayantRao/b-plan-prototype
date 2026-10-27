"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ErrorState, FullPageSpinner } from "@/components/common/states";
import { useAuth } from "@/features/auth/auth-provider";
import { ROLE_HOME } from "@/lib/roles";
import type { Role } from "@/types/api";

/**
 * Navigation guard: sends signed-out visitors to /login and signed-in users to
 * their own area. This is a usability layer only: the API enforces the real
 * permissions on every request.
 */
export function RoleGuard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { status, user, error, retry, explicitSignOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = user !== null && roles.includes(user.role);

  useEffect(() => {
    if (error) return;
    if (status === "unauthenticated") {
      router.replace(
        explicitSignOut ? "/login" : `/login?next=${encodeURIComponent(pathname)}`,
      );
    } else if (status === "authenticated" && user && !allowed) {
      router.replace(ROLE_HOME[user.role]);
    }
  }, [status, user, allowed, error, explicitSignOut, pathname, router]);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-md p-6 pt-24">
        <ErrorState title="Can't verify your session" error={error} onRetry={retry} />
      </div>
    );
  }
  if (status !== "authenticated" || !allowed) return <FullPageSpinner />;
  return <>{children}</>;
}
