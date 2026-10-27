"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Circle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { authApi } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-provider";
import {
  passwordRules,
  registerSchema,
  type RegisterValues,
} from "@/features/auth/schemas";
import { toApiError } from "@/lib/api/errors";
import { applyServerFieldErrors } from "@/lib/form";

const RESEND_COOLDOWN_SECONDS = 30;

function DetailsStep({ onDone }: { onDone: (email: string) => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" },
  });
  const password = useWatch({ control, name: "password" });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await authApi.register(values);
      onDone(values.email);
    } catch (error) {
      if (
        applyServerFieldErrors(error, setError, [
          "firstName",
          "lastName",
          "email",
          "password",
          "confirmPassword",
        ])
      ) {
        return;
      }
      setFormError(toApiError(error).message);
    }
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Patient accounts only. Doctors are onboarded and verified by an administrator.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        {formError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <TextField label="First name" autoComplete="given-name" error={errors.firstName?.message} {...register("firstName")} />
          <TextField label="Last name" autoComplete="family-name" error={errors.lastName?.message} {...register("lastName")} />
        </div>
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <TextField label="Password" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Password requirements">
          {passwordRules.map((rule) => {
            const ok = rule.test(password ?? "");
            return (
              <li key={rule.id} className={ok ? "text-emerald-700" : "text-muted-foreground"}>
                <span className="inline-flex items-center gap-1">
                  {ok ? <Check className="size-3" aria-hidden /> : <Circle className="size-3" aria-hidden />}
                  {rule.label}
                </span>
              </li>
            );
          })}
        </ul>

        <TextField label="Confirm password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />

        <Button type="submit" size="lg" className="h-10 w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Sending code…" : "Continue"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function VerifyStep({ email, onBack }: { email: string; onBack: () => void }) {
  const { completeSignUp } = useAuth();
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = async (code: string) => {
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const user = await completeSignUp(email, code);
      toast.add({ type: "success", title: "Account verified", description: "Welcome to Magadh Ventures." });
      router.replace(user.role === "patient" ? "/patient" : "/");
    } catch (err) {
      setError(toApiError(err).message);
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    try {
      await authApi.resendOtp(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.add({ type: "success", title: "Code sent", description: "If a sign-up is pending for this email, a new code is on its way." });
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        If <span className="font-medium text-foreground">{email}</span> can be registered, we&apos;ve
        sent a 6-digit code. It expires in 10 minutes.
      </p>

      <div className="mt-8 space-y-4">
        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          onComplete={(code) => void verify(code)}
          inputMode="numeric"
          pattern="^[0-9]+$"
          disabled={verifying}
          autoFocus
          aria-label="Verification code"
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot key={i} index={i} className="size-11 text-base" />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <Button size="lg" className="h-10 w-full" disabled={otp.length !== 6 || verifying} onClick={() => void verify(otp)}>
          {verifying ? <Spinner /> : null}
          {verifying ? "Verifying…" : "Verify and continue"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground">
            Use a different email
          </button>
          <button
            type="button"
            onClick={() => void resend()}
            disabled={cooldown > 0 || resending}
            className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending…" : "Resend code"}
          </button>
        </div>

        {
      // Inlined (not imported) so the bundler can strip this whole block from
      // production builds unless NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=true.
      process.env.NODE_ENV !== "production" ||
      process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === "true" ? (
          <p className="rounded-lg border border-dashed bg-muted/50 p-3 text-xs text-muted-foreground">
            Development: with no email provider configured, the code is printed in the API
            server log (look for <code className="font-mono">[SIMULATED EMAIL]</code>).
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [email, setEmail] = useState<string | null>(null);
  return email === null ? (
    <DetailsStep onDone={setEmail} />
  ) : (
    <VerifyStep email={email} onBack={() => setEmail(null)} />
  );
}
