import { apiPageRequest, apiRequest } from "@/lib/api";

export type Enrollment = {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  thumbnailUrl?: string | null;
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

export type LessonVideoAccess = {
  lessonId: string;
  videoUrl: string;
  expiresAt: string;
};

export type CourseProgress = {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  completed: boolean;
};

export type LearningNote = {
  id: string;
  title: string;
  content: string;
  lessonId: string | null;
  videoSecond: number | null;
  createdAt: string;
  updatedAt: string;
};

export type LearningNoteInput = {
  title: string;
  content: string;
  lessonId?: string | null;
  videoSecond?: number | null;
};

export type SavedLesson = {
  id: string;
  lessonId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  sectionTitle: string;
  lessonTitle: string;
  lessonType: string;
  durationSeconds: number | null;
  savedAt: string;
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

export type LearningQuiz = {
  id: string;
  lessonId: string;
  passingScore: number;
  questions: {
    id: string;
    prompt: string;
    position: number;
    options: { id: string; label: string; position: number }[];
  }[];
};

export type LearningQuizAttempt = {
  id: string;
  quizId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  passed: boolean;
  submittedAt: string;
};

export type LearningQuizAnswer = { questionId: string; optionId: string };

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

export async function fetchLessonVideoAccess(accessToken: string, lessonId: string) {
  return apiRequest<LessonVideoAccess>(`/lessons/${encodeURIComponent(lessonId)}/video-access`, {
    accessToken,
  });
}

export async function fetchLearningQuiz(accessToken: string, lessonId: string) {
  return apiRequest<LearningQuiz>(`/lessons/${encodeURIComponent(lessonId)}/quiz`, {
    accessToken,
  });
}

export async function submitLearningQuiz(
  accessToken: string,
  lessonId: string,
  answers: LearningQuizAnswer[],
) {
  return apiRequest<LearningQuizAttempt>(`/lessons/${encodeURIComponent(lessonId)}/quiz-attempts`, {
    method: "POST",
    accessToken,
    body: { answers },
  });
}

export async function completeLearningLesson(accessToken: string, lessonId: string) {
  return apiRequest<CourseProgress>(`/lessons/${encodeURIComponent(lessonId)}/complete`, {
    method: "POST",
    accessToken,
  });
}

export async function fetchMyNotes(accessToken: string) {
  return apiPageRequest<LearningNote>("/me/notes?page=0&size=100", { accessToken });
}

export async function createLearningNote(accessToken: string, note: LearningNoteInput) {
  return apiRequest<LearningNote>("/me/notes", { method: "POST", accessToken, body: note });
}

export async function updateLearningNote(
  accessToken: string,
  noteId: string,
  note: LearningNoteInput,
) {
  return apiRequest<LearningNote>(`/me/notes/${encodeURIComponent(noteId)}`, {
    method: "PUT",
    accessToken,
    body: note,
  });
}

export async function deleteLearningNote(accessToken: string, noteId: string) {
  return apiRequest<void>(`/me/notes/${encodeURIComponent(noteId)}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function fetchSavedLessons(accessToken: string, page = 0, size = 20) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return apiPageRequest<SavedLesson>(`/me/saved-lessons?${params.toString()}`, { accessToken });
}

export async function saveLearningLesson(accessToken: string, lessonId: string) {
  return apiRequest<SavedLesson>(`/me/saved-lessons/${encodeURIComponent(lessonId)}`, {
    method: "PUT",
    accessToken,
  });
}

export async function unsaveLearningLesson(accessToken: string, lessonId: string) {
  return apiRequest<void>(`/me/saved-lessons/${encodeURIComponent(lessonId)}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function fetchLearningCurriculum(accessToken: string, slug: string) {
  return apiRequest<LearningCurriculum>(`/courses/${encodeURIComponent(slug)}/curriculum`, {
    accessToken,
  });
}
