"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { ROLE_HOME } from "@/lib/roles";
import { cn } from "cn";

/** Header/hero buttons that adapt to whether someone is signed in. */
export function AuthCta({ size = "default", className }: { size?: "default" | "lg"; className?: string }) {
  const { status, user } = useAuth();
  const sizing = size === "lg" ? "h-10 px-4 text-sm" : "h-9";

  if (status === "authenticated" && user) {
    return (
      <Link href={ROLE_HOME[user.role]} className={cn(buttonVariants({ size: "lg" }), sizing, className)}>
        Go to dashboard
      </Link>
    );
  }
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), sizing)}>
        Sign in
      </Link>
      <Link href="/register" className={cn(buttonVariants({ size: "lg" }), sizing)}>
        Get started
      </Link>
    </div>
  );
}
