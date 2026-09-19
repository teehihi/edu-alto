export {
  forgotPassword,
  getCurrentUser,
  getProfile,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  updateCurrentUser,
  updateProfile,
  verifyEmail,
  verifyResetOtp,
  useAuth
} from "@/lib/auth";
export type { AuthUser } from "@/lib/auth";
export type { UserProfile, StudentProfile, InstructorProfile, UpdateProfileRequest } from "@/types/auth";
