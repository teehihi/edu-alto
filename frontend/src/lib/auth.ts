"use client";

import { useCallback, useMemo } from "react";
import { authApi, currentUserApi, profileApi, uploadAvatarFile } from "@/lib/auth-client";
import { useAuthSession } from "@/lib/auth-session";
import { ApiClientError } from "@/lib/api";
import type {
  CurrentUser,
  EmailRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateCurrentUserRequest,
  UpdateProfileRequest,
  UserProfile,
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

  const getValidToken = useCallback(async () => {
    const token = await session.getAccessToken();
    if (!token) {
      throw new Error("Vui lòng đăng nhập để tiếp tục");
    }
    return token;
  }, [session]);

  const callWithRefresh = useCallback(
    async <T>(apiCall: (token: string) => Promise<T>): Promise<T> => {
      let token = await getValidToken();
      try {
        return await apiCall(token);
      } catch (error) {
        if (!(error instanceof ApiClientError) || error.status !== 401) {
          throw error;
        }
        await session.refreshSession();
        token = await getValidToken();
        return await apiCall(token);
      }
    },
    [getValidToken, session]
  );

  const getProfile = useCallback(async (): Promise<UserProfile> => {
    return callWithRefresh((token) => profileApi.getProfile(token));
  }, [callWithRefresh]);

  const updateProfile = useCallback(
    async (payload: UpdateProfileRequest): Promise<UserProfile> => {
      const updatedProfile = await callWithRefresh((token) => profileApi.updateProfile(token, payload));
      session.updateUserAvatar(updatedProfile.avatarUrl ?? null);
      await session.reloadCurrentUser();
      return updatedProfile;
    },
    [callWithRefresh, session]
  );

  const uploadAvatar = useCallback(
    async (file: File): Promise<UserProfile> => {
      const updatedProfile = await callWithRefresh(async (token) => {
        try {
          const { uploadUrl, objectKey } = await profileApi.getAvatarUploadUrl(token, {
            contentType: file.type,
            contentLength: file.size
          });
          await uploadAvatarFile(uploadUrl, file);
          return await profileApi.completeAvatarUpload(token, { objectKey });
        } catch {
          // Direct upload failed (e.g. R2 CORS or network restriction), fallback to backend multipart upload
          return await profileApi.uploadAvatarMultipart(token, file);
        }
      });
      session.updateUserAvatar(updatedProfile.avatarUrl ?? null);
      await session.reloadCurrentUser();
      return updatedProfile;
    },
    [callWithRefresh, session]
  );

  const updateCurrentUser = useCallback(
    async (payload: UpdateCurrentUserRequest) => {
      const user = await callWithRefresh((token) => currentUserApi.updateCurrentUser(token, payload));
      await session.reloadCurrentUser();
      return user;
    },
    [callWithRefresh, session]
  );

  return useMemo(
    () => ({
      user: session.user,
      loading: session.isLoading,
      isAuthenticated: session.isAuthenticated,
      login: session.login,
      logout: session.logout,
      getCurrentUser: session.reloadCurrentUser,
      updateCurrentUser,
      getProfile,
      updateProfile,
      uploadAvatar,
      updateUserAvatar: session.updateUserAvatar
    }),
    [
      session.user,
      session.isLoading,
      session.isAuthenticated,
      session.login,
      session.logout,
      session.reloadCurrentUser,
      updateCurrentUser,
      getProfile,
      updateProfile,
      uploadAvatar,
      session.updateUserAvatar
    ]
  );
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

export async function getProfile(accessToken: string) {
  return profileApi.getProfile(accessToken);
}

export async function updateProfile(accessToken: string, payload: UpdateProfileRequest) {
  return profileApi.updateProfile(accessToken, payload);
}
