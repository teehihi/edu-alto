import type { CourseListItem, CourseLevel } from "@/types/course";

export type CourseRecommendationItem = CourseListItem & {
  itemId: string | null;
  score: number;
  tier: string;
  reasonCode: string;
  reasonText: string;
};

export type CourseRecommendationsResponse = {
  snapshotId: string | null;
  algorithmVersion: string;
  personalized: boolean;
  personalizationEnabled: boolean;
  onboardingCompleted: boolean;
  generatedAt: string;
  items: CourseRecommendationItem[];
};

export type LearningNextItem = {
  itemId: string;
  itemType: "LESSON" | "QUIZ_REVIEW";
  targetId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  lessonId: string;
  lessonTitle: string;
  sectionTitle: string;
  targetUrl: string;
  actionLabel: string;
  score: number;
  tier: string;
  reasonCode: string;
  reasonText: string;
  estimatedMinutes: number | null;
  completedLessons: number;
  totalLessons: number;
};

export type LearningNextRecommendationsResponse = {
  snapshotId: string | null;
  algorithmVersion: string;
  personalizationEnabled: boolean;
  generatedAt: string;
  items: LearningNextItem[];
};

export type LearningPreferences = {
  preferredTopics: string[];
  preferredLevel: CourseLevel | null;
  learningGoal: string | null;
  weeklyTargetHours: number | null;
  personalizationEnabled: boolean;
  onboardingCompleted: boolean;
  suggestedTopics: string[];
};

export type UpdateLearningPreferencesPayload = {
  preferredTopics: string[];
  preferredLevel?: CourseLevel | null;
  learningGoal?: string | null;
  weeklyTargetHours?: number | null;
  personalizationEnabled?: boolean;
};

export type RecommendationFeedbackPayload = {
  snapshotId?: string | null;
  recommendationItemId?: string | null;
  targetType: "COURSE" | "LESSON" | "QUIZ_REVIEW";
  targetId: string;
  feedbackType: "CLICKED" | "STARTED" | "DISMISSED" | "HELPFUL";
};
