import { apiRequest } from "@/lib/api";
import type {
  CourseRecommendationsResponse,
  LearningNextRecommendationsResponse,
  LearningPreferences,
  RecommendationFeedbackPayload,
  UpdateLearningPreferencesPayload,
} from "@/types/recommendation";

export async function fetchCourseRecommendations(options?: {
  courseId?: string;
  limit?: number;
  accessToken?: string | null;
}): Promise<CourseRecommendationsResponse> {
  const query = new URLSearchParams();
  if (options?.courseId) query.set("courseId", options.courseId);
  if (options?.limit !== undefined) query.set("limit", String(options.limit));
  const qs = query.toString();
  const path = `/recommendations/courses${qs ? `?${qs}` : ""}`;
  return apiRequest<CourseRecommendationsResponse>(path, {
    accessToken: options?.accessToken ?? undefined,
  });
}

export async function fetchLearningNextRecommendations(
  accessToken: string,
  limit = 5,
): Promise<LearningNextRecommendationsResponse> {
  return apiRequest<LearningNextRecommendationsResponse>(
    `/me/recommendations/learning?limit=${encodeURIComponent(String(limit))}`,
    { accessToken },
  );
}

export async function fetchLearningPreferences(accessToken: string): Promise<LearningPreferences> {
  return apiRequest<LearningPreferences>("/me/learning-preferences", { accessToken });
}

export async function updateLearningPreferences(
  accessToken: string,
  payload: UpdateLearningPreferencesPayload,
): Promise<LearningPreferences> {
  return apiRequest<LearningPreferences>("/me/learning-preferences", {
    method: "PUT",
    accessToken,
    body: payload,
  });
}

export async function submitRecommendationFeedback(
  accessToken: string,
  payload: RecommendationFeedbackPayload,
): Promise<void> {
  await apiRequest<void>("/me/recommendations/feedback", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export async function recordCourseViewSignal(accessToken: string, courseId: string): Promise<void> {
  await apiRequest<void>("/me/recommendations/signals/course-view", {
    method: "POST",
    accessToken,
    body: { courseId },
  });
}
