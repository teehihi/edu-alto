import { apiPageRequest, apiRequest } from "@/lib/api";

export type MonthlyRevenueStat = {
  month: string;
  revenue: number;
  ordersCount: number;
  isCurrent: boolean;
};

export type CategoryDistribution = {
  name: string;
  count: number;
  percentage: number;
  color: string;
};

export type AdminTopCourse = {
  id: string;
  title: string;
  instructorName: string;
  studentsCount: number;
  revenue: number;
  rating: number;
};

export type AdminDashboardSummary = {
  totalRevenue: number;
  pendingOrdersCount: number;
  totalCoursesCount: number;
  publishedCoursesCount: number;
  draftCoursesCount: number;
  totalUsersCount: number;
  totalStudentsCount: number;
  totalInstructorsCount: number;
  monthlyStats: MonthlyRevenueStat[];
  categoryDistribution: CategoryDistribution[];
  topCourses: AdminTopCourse[];
};

export type AdminUserItem = {
  id: string;
  fullName: string;
  email: string;
  status: "ACTIVE" | "PENDING_VERIFICATION" | "LOCKED" | "DISABLED";
  roles: ("ADMIN" | "INSTRUCTOR" | "STUDENT")[];
  createdAt: string;
  enrolledCoursesCount: number;
  teachingCoursesCount: number;
  avatarUrl: string | null;
};

export type PaymentMethodStat = {
  provider: string;
  label: string;
  count: number;
  amount: number;
  percentage: number;
  color: string;
};

export type AdminAnalytics = {
  paymentMethods: PaymentMethodStat[];
  completedLessonsCount: number;
  courseCompletionRate: number;
  averageQuizScore: number;
  averageCourseRating: number;
  totalReviewsCount: number;
  totalEnrollmentsCount: number;
};

export function fetchAdminDashboardSummary(accessToken: string, timeRange?: string) {
  const query = timeRange ? `?timeRange=${encodeURIComponent(timeRange)}` : "";
  return apiRequest<AdminDashboardSummary>(`/admin/dashboard/summary${query}`, { accessToken });
}

export function fetchAdminUsers(
  accessToken: string,
  page = 0,
  size = 20,
  keyword?: string,
  role?: string,
) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (keyword && keyword.trim()) {
    params.set("keyword", keyword.trim());
  }
  if (role && role !== "ALL") {
    params.set("role", role);
  }
  return apiPageRequest<AdminUserItem>(`/admin/users?${params.toString()}`, { accessToken });
}

export function updateAdminUserStatus(accessToken: string, userId: string, status: string) {
  return apiRequest<void>(`/admin/users/${encodeURIComponent(userId)}/status`, {
    method: "PATCH",
    accessToken,
    body: { status },
  });
}

export function updateAdminUserRoles(accessToken: string, userId: string, roles: string[]) {
  return apiRequest<void>(`/admin/users/${encodeURIComponent(userId)}/roles`, {
    method: "PATCH",
    accessToken,
    body: { roles },
  });
}

export function createAdminUser(
  accessToken: string,
  payload: { fullName: string; email: string; password: string; roles: string[] },
) {
  return apiRequest<AdminUserItem>("/admin/users", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function resetAdminUserPassword(accessToken: string, userId: string, newPassword: string) {
  return apiRequest<void>(`/admin/users/${encodeURIComponent(userId)}/reset-password`, {
    method: "POST",
    accessToken,
    body: { newPassword },
  });
}

export function fetchAdminAnalytics(accessToken: string) {
  return apiRequest<AdminAnalytics>("/admin/analytics", { accessToken });
}

export type AdminPermission = {
  id: string;
  name: string;
  apiPath: string;
  method: string;
  module: string;
  description: string | null;
  createdAt: string;
};

export type AdminRoleDetail = {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  permissions: AdminPermission[];
  createdAt: string;
  updatedAt: string;
};

export function fetchAdminRoles(accessToken: string) {
  return apiRequest<AdminRoleDetail[]>("/admin/roles", { accessToken });
}

export function fetchAdminRoleById(accessToken: string, roleId: string) {
  return apiRequest<AdminRoleDetail>(`/admin/roles/${encodeURIComponent(roleId)}`, { accessToken });
}

export function updateAdminRolePermissions(
  accessToken: string,
  roleId: string,
  payload: { description?: string; permissionIds: string[] },
) {
  return apiRequest<AdminRoleDetail>(`/admin/roles/${encodeURIComponent(roleId)}/permissions`, {
    method: "PUT",
    accessToken,
    body: payload,
  });
}

export function fetchAdminPermissions(accessToken: string) {
  return apiRequest<AdminPermission[]>("/admin/permissions", { accessToken });
}
