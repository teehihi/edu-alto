import { apiRequest } from "@/lib/api";
import type {
  AuthMessageResponse,
  AuthTokenResponse,
  AvatarCompleteRequest,
  AvatarUploadUrlRequest,
  AvatarUploadUrlResponse,
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

export const profileApi = {
  getProfile: (accessToken: string) =>
    apiRequest<UserProfile>("/me/profile", {
      method: "GET",
      accessToken
    }),

  getPublicProfile: (identifier: string) =>
    apiRequest<UserProfile>(`/profiles/${encodeURIComponent(identifier)}`, {
      method: "GET"
    }),

  updateProfile: (accessToken: string, body: UpdateProfileRequest) =>
    apiRequest<UserProfile>("/me/profile", {
      method: "PUT",
      accessToken,
      body
    }),

  getAvatarUploadUrl: (accessToken: string, body: AvatarUploadUrlRequest) =>
    apiRequest<AvatarUploadUrlResponse>("/me/profile/avatar/upload-url", {
      method: "POST",
      accessToken,
      body
    }),

  completeAvatarUpload: (accessToken: string, body: AvatarCompleteRequest) =>
    apiRequest<UserProfile>("/me/profile/avatar/complete", {
      method: "POST",
      accessToken,
      body
    }),

  uploadAvatarMultipart: (accessToken: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<UserProfile>("/me/profile/avatar", {
      method: "POST",
      accessToken,
      body: formData
    });
  }
};

export async function uploadAvatarFile(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type
    },
    body: file
  });

  if (!response.ok) {
    throw new Error("Không thể tải ảnh trực tiếp lên hệ thống lưu trữ Cloudflare R2.");
  }
}
