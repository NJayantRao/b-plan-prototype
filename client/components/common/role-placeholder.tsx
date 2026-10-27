"use client";

import { Hourglass } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { useAuth } from "@/features/auth/auth-provider";

/** Dashboard for roles whose workflows arrive in a later phase. Honest about it. */
export function RolePlaceholder({ title, description }: { title: string; description: string }) {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title={`Welcome, ${user?.firstName ?? ""}`} description="Your account is active." />
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-16 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Hourglass className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </>
  );
}
