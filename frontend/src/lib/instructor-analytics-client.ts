import { apiRequest } from "@/lib/api";

export interface InstructorMonthlyTrend {
  month: string;
  label: string;
  newEnrollments: number;
  completedCount: number;
  revenue: number;
  completionRate: number;
}

export interface InstructorAnalyticsSummary {
  totalStudents: number;
  newStudentsThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  averageCompletionRate: number;
  totalCertificates: number;
  totalCompletedLessons: number;
}

export interface InstructorCoursePerformance {
  courseId: string;
  courseTitle: string;
  courseStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  price: number;
  studentCount: number;
  completedStudentsCount: number;
  completionRate: number;
  totalLessons: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
}

export interface InstructorAnalyticsOverview {
  summary: InstructorAnalyticsSummary;
  monthlyTrends: InstructorMonthlyTrend[];
  coursePerformances: InstructorCoursePerformance[];
}

export async function fetchInstructorAnalyticsOverview(
  accessToken?: string | null,
  courseId?: string,
): Promise<InstructorAnalyticsOverview> {
  const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
  return apiRequest<InstructorAnalyticsOverview>(`/instructor/analytics/overview${query}`, {
    accessToken,
  });
}
