export type UserStatus = "PENDING_VERIFICATION" | "ACTIVE" | "LOCKED" | "DISABLED";

export type RoleName = "STUDENT" | "INSTRUCTOR" | "ADMIN" | string;

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  status: UserStatus;
  roles: RoleName[];
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RegisterRequest = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type EmailRequest = {
  email: string;
};

export type VerifyOtpRequest = {
  email: string;
  otp: string;
};

export type ResetPasswordRequest = {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
};

export type UpdateCurrentUserRequest = {
  fullName: string;
};

export type AuthMessageResponse = {
  message: string;
};

export type AuthTokenResponse = {
  tokenType: "Bearer";
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
  user: CurrentUser;
};

export type ApiErrorDetail = {
  field: string | null;
  message: string;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details: ApiErrorDetail[];
};
