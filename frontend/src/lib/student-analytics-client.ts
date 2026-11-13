import { apiRequest } from "@/lib/api";

export interface StudentAnalyticsSummary {
  activeCourseCount: number;
  totalLessons: number;
  completedLessons: number;
  completionRate: number;
  overallAverageScoreOutOf10: number | null;
  averageQuizScoreOutOf10: number | null;
  quizPassRate: number | null;
  attemptedQuizzesCount: number;
  passedQuizzesCount: number;
  averageAssignmentScoreOutOf10: number | null;
  publishedAssignmentsCount: number;
  submittedAssignmentsCount: number;
  onTimeAssignmentsCount: number;
  currentStreakDays: number;
  longestStreakDays: number;
  activeDaysInWindow: number;
  estimatedStudyHoursInWindow: number;
  completedLessonsInWindow: number;
  currentWeekHours: number;
  currentWeekActiveDays: number;
}

export interface StudentDailyActivity {
  date: string;
  label: string;
  fullLabel: string;
  studyHours: number;
  studyMinutes: number;
  completedLessons: number;
  today: boolean;
}

export interface StudentScoreTrendPoint {
  itemId: string;
  title: string;
  assessmentType: "QUIZ" | "ASSIGNMENT";
  courseId: string;
  courseTitle: string;
  scoreOutOf10: number;
  passed: boolean;
  recordedAt: string;
}

export interface StudentCoursePerformanceSummary {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  totalLessons: number;
  completedLessons: number;
  completionPercent: number;
  bestQuizAverageOutOf10: number | null;
  attemptedQuizzesCount: number;
  totalQuizzesCount: number;
  passedQuizzesCount: number;
  assignmentAverageOutOf10: number | null;
  submittedAssignmentsCount: number;
  totalAssignmentsCount: number;
  lastActivityAt: string | null;
}

export interface StudentFocusItem {
  id: string;
  type: "FAILED_QUIZ" | "OVERDUE_ASSIGNMENT" | "DUE_SOON_ASSIGNMENT" | "INACTIVE_COURSE";
  priority: "HIGH" | "MEDIUM";
  title: string;
  description: string;
  courseId: string;
  courseTitle: string;
  actionHref: string;
  actionLabel: string;
}

export interface StudentCompletionPrediction {
  completionProbability: number;
  completionPercentage: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  statusBadge: string;
  badgeColor: "emerald" | "amber" | "rose" | string;
  primaryFactor: string;
  primaryFactorLabel: string;
  estimatedCompletionDate: string;
  priorityActionTitle: string;
  priorityActionLabel: string;
  priorityActionHref: string;
}

export interface StudentLearningAnalyticsOverview {
  windowDays: number;
  summary: StudentAnalyticsSummary;
  currentWeekActivity: StudentDailyActivity[];
  windowDailyActivity: StudentDailyActivity[];
  scoreTrend: StudentScoreTrendPoint[];
  coursePerformances: StudentCoursePerformanceSummary[];
  focusItems: StudentFocusItem[];
  prediction?: StudentCompletionPrediction | null;
}

export interface StudentCourseQuizItem {
  quizId: string;
  lessonId: string;
  lessonTitle: string;
  sectionTitle: string;
  passingScoreOutOf10: number;
  bestScoreOutOf10: number | null;
  latestScoreOutOf10: number | null;
  passed: boolean;
  attemptCount: number;
  lastAttemptAt: string | null;
}

export interface StudentCourseAssignmentItem {
  assignmentId: string;
  title: string;
  dueAt: string | null;
  maxScore: number;
  submitted: boolean;
  submittedAt: string | null;
  late: boolean;
  rawScore: number | null;
  scoreOutOf10: number | null;
  gradedAt: string | null;
}

export interface StudentCourseAnalytics {
  course: StudentCoursePerformanceSummary;
  quizzes: StudentCourseQuizItem[];
  assignments: StudentCourseAssignmentItem[];
  focusItems: StudentFocusItem[];
}

export async function fetchStudentLearningAnalytics(
  accessToken: string,
  days: 7 | 30 = 7,
): Promise<StudentLearningAnalyticsOverview> {
  return apiRequest<StudentLearningAnalyticsOverview>(
    `/me/learning-analytics?days=${encodeURIComponent(String(days))}`,
    { accessToken },
  );
}

export async function fetchStudentCourseAnalytics(
  accessToken: string,
  courseId: string,
): Promise<StudentCourseAnalytics> {
  return apiRequest<StudentCourseAnalytics>(
    `/me/learning-analytics/courses/${encodeURIComponent(courseId)}`,
    { accessToken },
  );
}
