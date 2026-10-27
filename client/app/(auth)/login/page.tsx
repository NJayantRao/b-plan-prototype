"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/auth-provider";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { toApiError } from "@/lib/api/errors";
import { applyServerFieldErrors } from "@/lib/form";
import { safeNextPath } from "@/lib/roles";

const DEMO_PASSWORD = "Demo@12345";
const DEMO_ACCOUNTS = [
  { role: "Patient", email: "patient@demo.magadh.test" },
  { role: "Doctor (verified)", email: "doctor@demo.magadh.test" },
  { role: "Doctor (pending)", email: "doctor.pending@demo.magadh.test" },
  { role: "Admin", email: "admin@demo.magadh.test" },
  { role: "Partner", email: "partner@demo.magadh.test" },
  { role: "Responder", email: "responder@demo.magadh.test" },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await signIn(values.email, values.password);
      router.replace(safeNextPath(next, user.role));
    } catch (error) {
      if (applyServerFieldErrors(error, setError, ["email", "password"])) return;
      setFormError(toApiError(error).message);
    }
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back. Enter your details to continue.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        {formError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {formError}
          </div>
        ) : null}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" size="lg" className="h-10 w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Magadh Ventures?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>

      {
      // Inlined (not imported) so the bundler can strip this whole block from
      // production builds unless NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=true.
      process.env.NODE_ENV !== "production" ||
      process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === "true" ? (
        <div className="mt-8 rounded-xl border border-dashed bg-muted/50 p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Demo accounts (synthetic data)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setValue("email", account.email, { shouldValidate: true });
                  setValue("password", DEMO_PASSWORD, { shouldValidate: true });
                  setFormError(null);
                }}
                className="rounded-full border bg-card px-3 py-1 text-xs font-medium hover:border-primary hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {account.role}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Fills the form. Run <code className="font-mono">pnpm seed</code> in the server first.
          </p>
        </div>
      ) : null}
    </div>
  );
}
