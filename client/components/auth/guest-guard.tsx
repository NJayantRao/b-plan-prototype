"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { FullPageSpinner } from "@/components/common/states";
import { useAuth } from "@/features/auth/auth-provider";
import { safeNextPath } from "@/lib/roles";

/** For /login and /register: signed-in users are sent on to their dashboard. */
export function GuestGuard({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(safeNextPath(next, user.role));
    }
  }, [status, user, next, router]);

  if (status === "loading" || status === "authenticated") return <FullPageSpinner />;
  return <>{children}</>;
}
