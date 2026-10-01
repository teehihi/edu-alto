import { apiRequest } from "@/lib/api";

export type InstructorCourseMetrics = {
  courseId: string;
  chapterCount: number;
  publicReviewCount: number;
  paidOrderCount: number;
  activeEnrollmentCount: number;
  wishlistCount: number;
  certificateCount: number;
};

export async function fetchInstructorCourseMetrics(
  accessToken?: string | null,
): Promise<InstructorCourseMetrics[]> {
  return apiRequest<InstructorCourseMetrics[]>("/instructor/analytics/course-metrics", {
    accessToken,
  });
}

export function indexInstructorCourseMetrics(
  metrics: InstructorCourseMetrics[],
): Record<string, InstructorCourseMetrics> {
  return Object.fromEntries(metrics.map((metric) => [metric.courseId, metric]));
}
