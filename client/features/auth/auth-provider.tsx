"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onSessionExpired } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { MeResponse, User, VerificationStatus } from "@/types/api";
import { authApi } from "./api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  doctorVerificationStatus: VerificationStatus | undefined;
  /**
   * True after the user deliberately signs out, so route guards send them to a
   * plain /login instead of /login?next=<page they just left>.
   */
  explicitSignOut: boolean;
  /** Set when the session check failed for a reason other than "not signed in". */
  error: ApiClientError | null;
  retry: () => void;
  signIn: (email: string, password: string) => Promise<User>;
  completeSignUp: (email: string, otp: string) => Promise<User>;
  signOut: () => Promise<void>;
  /** Re-reads the session (e.g. after a doctor's verification status changes). */
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Resolves to null when nobody is signed in; only real failures throw. */
const fetchSession = async (): Promise<MeResponse | null> => {
  try {
    return await authApi.me();
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) return null;
    throw error;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [explicitSignOut, setExplicitSignOut] = useState(false);

  const session = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchSession,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const clearSessionData = useCallback(() => {
    // Remove every cached query except the session itself, so the next user
    // never sees a previous user's data.
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== queryKeys.me[0],
    });
    queryClient.setQueryData(queryKeys.me, null);
  }, [queryClient]);

  // The API client reports when a token refresh fails.
  useEffect(() => onSessionExpired(clearSessionData), [clearSessionData]);

  const loadSession = useCallback(async (): Promise<MeResponse> => {
    const data = await queryClient.fetchQuery({
      queryKey: queryKeys.me,
      queryFn: fetchSession,
      staleTime: 0,
    });
    if (!data) throw new ApiClientError("Not signed in", 401, "AUTH_REQUIRED");
    return data;
  }, [queryClient]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await authApi.login(email, password);
      const { user } = await loadSession();
      setExplicitSignOut(false);
      return user;
    },
    [loadSession],
  );

  const completeSignUp = useCallback(
    async (email: string, otp: string) => {
      await authApi.verifyOtp(email, otp);
      const { user } = await loadSession();
      setExplicitSignOut(false);
      return user;
    },
    [loadSession],
  );

  const signOut = useCallback(async () => {
    setExplicitSignOut(true);
    try {
      await authApi.logout();
    } catch {
      // Even if the server is unreachable, drop the local session.
    }
    clearSessionData();
  }, [clearSessionData]);

  const refreshSession = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.me });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    const data = session.data ?? null;
    const failed = session.isError && !data;
    const status: AuthStatus = session.isPending
      ? "loading"
      : data
        ? "authenticated"
        : "unauthenticated";

    return {
      status,
      user: data?.user ?? null,
      doctorVerificationStatus: data?.doctorVerificationStatus,
      explicitSignOut,
      error:
        failed && session.error instanceof ApiClientError ? session.error : null,
      retry: () => void session.refetch(),
      signIn,
      completeSignUp,
      signOut,
      refreshSession,
    };
  }, [session, explicitSignOut, signIn, completeSignUp, signOut, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
