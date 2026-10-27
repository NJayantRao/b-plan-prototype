"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toast";
import { AuthProvider } from "@/features/auth/auth-provider";
import { ApiClientError } from "@/lib/api/errors";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Don't retry client errors (4xx): they won't succeed on a retry.
            retry: (failureCount, error) => {
              if (
                error instanceof ApiClientError &&
                error.status >= 400 &&
                error.status < 500
              ) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster>
        <AuthProvider>{children}</AuthProvider>
      </Toaster>
    </QueryClientProvider>
  );
}
