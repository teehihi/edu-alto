import { apiRequest } from "@/lib/api";

export type CreateInstructorQuizRequest = {
  passingScore: number;
  questions: {
    prompt: string;
    options: { label: string; correct: boolean }[];
  }[];
};

export type InstructorQuiz = {
  id: string;
  lessonId: string;
  passingScore: number;
  questions: { id: string; prompt: string; position: number }[];
};

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
