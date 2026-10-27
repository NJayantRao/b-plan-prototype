import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_URL } from "@/lib/env";
import type { ApiEnvelope } from "@/types/api";
import { toApiError } from "./errors";

/**
 * Axios instance for the Magadh API.
 *
 * - Auth uses HttpOnly cookies set by the API, so `withCredentials` is on and
 *   no token is ever read or stored by JavaScript.
 * - Do NOT add custom request headers: the API's CORS policy only allows
 *   Content-Type, Origin and Authorization, so anything else fails preflight.
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

// --- session-expiry pub/sub ------------------------------------------------
type Listener = () => void;
const sessionExpiredListeners = new Set<Listener>();

/** Subscribe to "the session could not be refreshed" events. Returns an unsubscribe fn. */
export const onSessionExpired = (listener: Listener): (() => void) => {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
};

// --- 401 -> refresh -> retry-once ------------------------------------------
type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/** Auth endpoints must never trigger a refresh (a 401 there is the real answer). */
const NO_REFRESH_PATHS = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/verify-otp",
  "/auth/send-otp",
  "/auth/refresh-token",
  "/auth/logout",
];

/** Concurrent 401s share one refresh request so the refresh token rotates once. */
let refreshInFlight: Promise<void> | null = null;

const refreshSession = (): Promise<void> => {
  refreshInFlight ??= api
    .post("/auth/refresh-token")
    .then(() => undefined)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const url = config?.url ?? "";

    const canRefresh =
      error.response?.status === 401 &&
      config !== undefined &&
      !config._retried &&
      !NO_REFRESH_PATHS.some((path) => url.startsWith(path));

    if (canRefresh) {
      config._retried = true;
      try {
        await refreshSession();
        return await api(config);
      } catch (retryError) {
        // Refresh failed (or the retry failed for another reason).
        const normalised = toApiError(retryError);
        if (normalised.status === 401) {
          sessionExpiredListeners.forEach((listener) => listener());
        }
        return Promise.reject(normalised);
      }
    }

    return Promise.reject(toApiError(error));
  },
);

// --- typed helpers ---------------------------------------------------------
/** Unwraps the `{ statusCode, success, message, data }` envelope. */
export const unwrap = async <T>(
  request: Promise<{ data: ApiEnvelope<T> }>,
): Promise<T> => (await request).data.data;
