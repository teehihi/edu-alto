import { apiRequest } from "@/lib/api";

export type CreateInstructorQuizRequest = {
  passingScore: number;
  questionsPerAttempt: number;
  durationMinutes: number;
  questions: {
    prompt: string;
    options: { label: string; correct: boolean }[];
  }[];
};

export type InstructorQuiz = {
  id: string;
  lessonId: string;
  passingScore: number;
  questionsPerAttempt: number;
  durationMinutes: number;
  editable: boolean;
  questions: {
    id: string;
    prompt: string;
    position: number;
    options: { id: string; label: string; correct: boolean; position: number }[];
  }[];
};

export type QuizQuestionGenerationRequest = {
  courseId: string;
  sectionId: string;
  lessonId?: string;
  title: string;
  description: string;
  content: string;
  focus: string;
  includeTitle: boolean;
  includeDescription: boolean;
  includeContent: boolean;
  attachmentIds: string[];
  pendingResourceVisibleToStudents: boolean;
  questionCount: number;
};

export type GeneratedQuizQuestions = {
  questions: {
    prompt: string;
    options: { label: string; correct: boolean }[];
  }[];
};

export function generateInstructorQuizQuestions(
  payload: QuizQuestionGenerationRequest,
  sourceFile?: File | null,
  accessToken?: string | null,
) {
  const body = new FormData();
  body.append("request", new Blob([JSON.stringify(payload)], { type: "application/json" }));
  if (sourceFile) body.append("sourceFile", sourceFile);
  return apiRequest<GeneratedQuizQuestions>("/instructor/quiz-question-generations", {
    method: "POST",
    body,
    accessToken,
  });
}

export function createInstructorQuiz(
  lessonId: string,
  payload: CreateInstructorQuizRequest,
  accessToken?: string | null,
) {
  return apiRequest<InstructorQuiz>(`/instructor/lessons/${encodeURIComponent(lessonId)}/quiz`, {
    method: "POST",
    body: payload,
    accessToken,
  });
}

export function fetchInstructorQuiz(lessonId: string, accessToken?: string | null) {
  return apiRequest<InstructorQuiz>(`/instructor/lessons/${encodeURIComponent(lessonId)}/quiz`, {
    accessToken,
  });
}

export function updateInstructorQuiz(
  lessonId: string,
  payload: CreateInstructorQuizRequest,
  accessToken?: string | null,
) {
  return apiRequest<InstructorQuiz>(`/instructor/lessons/${encodeURIComponent(lessonId)}/quiz`, {
    method: "PUT",
    body: payload,
    accessToken,
  });
}
