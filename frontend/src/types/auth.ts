export type UserStatus = "PENDING_VERIFICATION" | "ACTIVE" | "LOCKED" | "DISABLED";

export type RoleName = "STUDENT" | "INSTRUCTOR" | "ADMIN" | string;

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  status: UserStatus;
  roles: RoleName[];
  avatarUrl?: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentProfile = {
  learningGoal?: string | null;
  occupation?: string | null;
  educationLevel?: string | null;
  interests?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type InstructorProfile = {
  expertise: string;
  experienceYears?: number | null;
  teachingExperience?: string | null;
  qualificationSummary?: string | null;
  specialties?: string | null;
  verifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  status: UserStatus;
  roles: RoleName[];
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  language: string;
  websiteUrl?: string | null;
  xUrl?: string | null;
  linkedinUrl?: string | null;
  youtubeUrl?: string | null;
  facebookUrl?: string | null;
  studentProfile?: StudentProfile | null;
  instructorProfile?: InstructorProfile | null;
  createdAt: string;
  updatedAt: string;
};

export type RegisterRequest = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: "STUDENT" | "INSTRUCTOR";
  learningGoal?: string;
  expertise?: string;
  bio?: string;
};

export type UpdateProfileRequest = {
  fullName?: string;
  headline?: string;
  bio?: string;
  avatarUrl?: string;
  language?: string;
  websiteUrl?: string;
  xUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
  facebookUrl?: string;
  // Student fields
  learningGoal?: string;
  occupation?: string;
  educationLevel?: string;
  interests?: string;
  // Instructor fields
  expertise?: string;
  experienceYears?: number | null;
  teachingExperience?: string;
  qualificationSummary?: string;
  specialties?: string;
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

export type AvatarUploadUrlRequest = {
  contentType: string;
  contentLength: number;
};

export type AvatarUploadUrlResponse = {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
};

export type AvatarCompleteRequest = {
  objectKey: string;
};
