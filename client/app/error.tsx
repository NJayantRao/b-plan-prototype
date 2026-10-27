"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. You can try again.
      </p>
      {error.digest ? <p className="font-mono text-xs text-muted-foreground">Ref: {error.digest}</p> : null}
      <Button size="lg" className="h-9" onClick={reset}>Try again</Button>
    </main>
  );
}
