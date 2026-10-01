import { apiPageRequest, apiRequest } from "@/lib/api";

export type CourseReview = {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  rating: number;
  comment: string;
  status: string;
  instructorReply?: string | null;
  instructorRepliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CourseReviewSummary = {
  courseId: string;
  averageRating: number;
  reviewCount: number;
  ratingCounts?: Array<{ rating: number; count: number }>;
};

export type InstructorReviewSummary = Omit<CourseReviewSummary, "courseId">;

export async function fetchCourseReviews(courseId: string) {
  return apiPageRequest<CourseReview>(
    `/courses/${encodeURIComponent(courseId)}/reviews?page=0&size=20`,
  );
}

export async function fetchCourseReviewSummary(courseId: string) {
  return apiRequest<CourseReviewSummary>(
    `/courses/${encodeURIComponent(courseId)}/reviews/summary`,
  );
}

export async function fetchInstructorReviewSummary(accessToken: string) {
  return apiRequest<InstructorReviewSummary>("/instructor/reviews/summary", {
    accessToken,
  });
}

export async function saveCourseReview(
  accessToken: string,
  courseId: string,
  rating: number,
  comment: string,
) {
  return apiRequest<CourseReview>(`/me/courses/${encodeURIComponent(courseId)}/review`, {
    method: "PUT",
    accessToken,
    body: { rating, comment },
  });
}
