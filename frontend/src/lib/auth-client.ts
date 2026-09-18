import { apiRequest } from "@/lib/api";
import type {
  AuthMessageResponse,
  AuthTokenResponse,
  CurrentUser,
  EmailRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateCurrentUserRequest,
  VerifyOtpRequest
} from "@/types/auth";

export const authApi = {
  register: (body: RegisterRequest) =>
    apiRequest<AuthMessageResponse>("/auth/register", {
      method: "POST",
      body
    }),

  verifyEmail: (body: VerifyOtpRequest) =>
    apiRequest<AuthMessageResponse>("/auth/verify-email", {
      method: "POST",
      body
    }),

  resendVerification: (body: EmailRequest) =>
    apiRequest<AuthMessageResponse>("/auth/resend-verification", {
      method: "POST",
      body
    }),

  login: (body: LoginRequest) =>
    apiRequest<AuthTokenResponse>("/auth/login", {
      method: "POST",
      body
    }),

  refresh: (refreshToken: string) =>
    apiRequest<AuthTokenResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken }
    }),

  logout: (refreshToken: string) =>
    apiRequest<AuthMessageResponse>("/auth/logout", {
      method: "POST",
      body: { refreshToken }
    }),

  forgotPassword: (body: EmailRequest) =>
    apiRequest<AuthMessageResponse>("/auth/forgot-password", {
      method: "POST",
      body
    }),

  verifyResetOtp: (body: VerifyOtpRequest) =>
    apiRequest<AuthMessageResponse>("/auth/verify-reset-otp", {
      method: "POST",
      body
    }),

  resetPassword: (body: ResetPasswordRequest) =>
    apiRequest<AuthMessageResponse>("/auth/reset-password", {
      method: "POST",
      body
    })
};

export const currentUserApi = {
  getCurrentUser: (accessToken: string) =>
    apiRequest<CurrentUser>("/me", {
      method: "GET",
      accessToken
    }),

  updateCurrentUser: (accessToken: string, body: UpdateCurrentUserRequest) =>
    apiRequest<CurrentUser>("/me", {
      method: "PUT",
      accessToken,
      body
    })
};
