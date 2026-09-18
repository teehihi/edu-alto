"use client";

import { authApi, currentUserApi } from "@/lib/auth-client";
import { useAuthSession } from "@/lib/auth-session";
import { ApiClientError } from "@/lib/api";
import type {
  CurrentUser,
  EmailRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateCurrentUserRequest,
  VerifyOtpRequest
} from "@/types/auth";

export type AuthUser = CurrentUser;

export async function login(payload: LoginRequest) {
  return authApi.login(payload);
}

export async function register(payload: RegisterRequest) {
  return authApi.register(payload);
}

export async function verifyEmail(payload: VerifyOtpRequest) {
  return authApi.verifyEmail(payload);
}

export async function resendVerification(payload: EmailRequest) {
  return authApi.resendVerification(payload);
}

export async function forgotPassword(payload: EmailRequest) {
  return authApi.forgotPassword(payload);
}

export async function verifyResetOtp(payload: VerifyOtpRequest) {
  return authApi.verifyResetOtp(payload);
}

export async function resetPassword(payload: ResetPasswordRequest) {
  return authApi.resetPassword(payload);
}

export function useAuth() {
  const session = useAuthSession();
  return {
    user: session.user,
    loading: session.isLoading,
    isAuthenticated: session.isAuthenticated,
    login: session.login,
    logout: session.logout,
    getCurrentUser: session.reloadCurrentUser,
    updateCurrentUser: async (payload: UpdateCurrentUserRequest) => {
      let token = await session.getAccessToken();
      if (!token) {
        throw new Error("Vui lòng đăng nhập để tiếp tục");
      }

      let user: CurrentUser;
      try {
        user = await currentUserApi.updateCurrentUser(token, payload);
      } catch (error) {
        if (!(error instanceof ApiClientError) || error.status !== 401) {
          throw error;
        }
        await session.refreshSession();
        token = await session.getAccessToken();
        if (!token) {
          throw new Error("Vui lòng đăng nhập để tiếp tục");
        }
        user = await currentUserApi.updateCurrentUser(token, payload);
      }

      await session.reloadCurrentUser();
      return user;
    }
  };
}

export async function logout(refreshToken: string) {
  return authApi.logout(refreshToken);
}

export async function getCurrentUser(accessToken: string) {
  return currentUserApi.getCurrentUser(accessToken);
}

export async function updateCurrentUser(accessToken: string, payload: UpdateCurrentUserRequest) {
  return currentUserApi.updateCurrentUser(accessToken, payload);
}
