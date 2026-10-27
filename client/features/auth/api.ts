import { api, unwrap } from "@/lib/api/client";
import type { ApiEnvelope, MeResponse, User } from "@/types/api";

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const authApi = {
  /** Always resolves the same way whether or not the email is registered. */
  register: async (payload: RegisterPayload): Promise<void> => {
    await api.post<ApiEnvelope<undefined>>("/auth/sign-up", payload);
  },

  resendOtp: async (email: string): Promise<void> => {
    await api.post<ApiEnvelope<undefined>>("/auth/send-otp", { email });
  },

  verifyOtp: async (email: string, otp: string): Promise<User> =>
    (await unwrap<{ user: User }>(api.post("/auth/verify-otp", { email, otp })))
      .user,

  login: async (email: string, password: string): Promise<User> =>
    (await unwrap<{ user: User }>(api.post("/auth/sign-in", { email, password })))
      .user,

  logout: async (): Promise<void> => {
    await api.post<ApiEnvelope<undefined>>("/auth/logout");
  },

  me: (): Promise<MeResponse> => unwrap<MeResponse>(api.get("/auth/me")),
};
