import { apiPageRequest, apiRequest } from "@/lib/api";

export type Enrollment = {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  courseStatus: string;
  status: string;
  enrolledAt: string;
};

export type LessonContent = {
  id: string;
  courseId: string;
  sectionId: string;
  title: string;
  lessonType: string;
  content: string | null;
};

export type CourseProgress = {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  completed: boolean;
};

export type LearningCurriculum = {
  courseId: string;
  slug: string;
  sections: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
      lessonType: string;
      durationSeconds: number | null;
      preview: boolean;
    }[];
  }[];
};

export async function fetchMyEnrollments(accessToken: string) {
  return apiPageRequest<Enrollment>("/me/enrollments?page=0&size=100&sort=enrolledAt,desc", {
    accessToken,
  });
}

export async function fetchCourseProgress(accessToken: string, courseId: string) {
  return apiRequest<CourseProgress>(`/me/courses/${encodeURIComponent(courseId)}/progress`, {
    accessToken,
  });
}

export async function enrollInCourse(accessToken: string, courseId: string) {
  return apiRequest<string>(`/courses/${encodeURIComponent(courseId)}/enrollments`, {
    method: "POST",
    accessToken,
  });
}

export async function fetchLearningLesson(accessToken: string, lessonId: string) {
  return apiRequest<LessonContent>(`/lessons/${encodeURIComponent(lessonId)}`, { accessToken });
}

export async function completeLearningLesson(accessToken: string, lessonId: string) {
  return apiRequest<CourseProgress>(`/lessons/${encodeURIComponent(lessonId)}/complete`, {
    method: "POST",
    accessToken,
  });
}

export async function fetchLearningCurriculum(accessToken: string, slug: string) {
  return apiRequest<LearningCurriculum>(`/courses/${encodeURIComponent(slug)}/curriculum`, {
    accessToken,
  });
}
