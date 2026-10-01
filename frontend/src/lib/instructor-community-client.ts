import { apiPageRequest, apiRequest } from "@/lib/api";
import type { CourseReview } from "@/lib/review-client";

export async function fetchInstructorCourseReviews(
  courseId: string,
  accessToken: string,
  page = 0,
  size = 100,
) {
  return apiPageRequest<CourseReview>(
    `/instructor/courses/${encodeURIComponent(courseId)}/reviews?page=${page}&size=${size}`,
    { accessToken },
  );
}

export async function fetchAllInstructorCourseReviews(courseId: string, accessToken: string) {
  const reviews: CourseReview[] = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages) {
    const result = await fetchInstructorCourseReviews(courseId, accessToken, page);
    reviews.push(...result.data);
    totalPages = result.meta.totalPages;
    page += 1;
  }
  return reviews;
}

export function setInstructorReviewVisibility(
  courseId: string,
  reviewId: string,
  published: boolean,
  accessToken: string,
) {
  return apiRequest<CourseReview>(
    `/instructor/courses/${encodeURIComponent(courseId)}/reviews/${encodeURIComponent(reviewId)}/visibility`,
    { method: "PUT", accessToken, body: { published } },
  );
}

export function saveInstructorReviewReply(
  courseId: string,
  reviewId: string,
  reply: string,
  accessToken: string,
) {
  return apiRequest<CourseReview>(
    `/instructor/courses/${encodeURIComponent(courseId)}/reviews/${encodeURIComponent(reviewId)}/reply`,
    { method: "PUT", accessToken, body: { reply } },
  );
}

export function deleteInstructorReviewReply(
  courseId: string,
  reviewId: string,
  accessToken: string,
) {
  return apiRequest<void>(
    `/instructor/courses/${encodeURIComponent(courseId)}/reviews/${encodeURIComponent(reviewId)}/reply`,
    { method: "DELETE", accessToken },
  );
}
