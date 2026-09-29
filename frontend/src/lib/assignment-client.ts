import { apiRequest } from "@/lib/api";

export type Assignment = {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  dueAt: string | null;
  maxScore: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  submittedAt: string | null;
  responseText: string | null;
  score: number | null;
  feedback: string | null;
  gradedAt: string | null;
};

export async function fetchMyAssignments(accessToken: string) {
  return apiRequest<Assignment[]>("/me/assignments", { accessToken });
}

export async function submitAssignment(
  accessToken: string,
  assignmentId: string,
  responseText: string,
) {
  return apiRequest<Assignment>(`/assignments/${encodeURIComponent(assignmentId)}/submissions`, {
    method: "POST",
    accessToken,
    body: { responseText },
  });
}
