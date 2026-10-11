import { apiRequest } from "@/lib/api";
import type {
  ApplyCurriculumImportResponse,
  CreateCurriculumImportPayload,
  CurriculumImportChapter,
  CurriculumImportJob,
  EducationLevel,
  EducationPolicyResponse,
} from "@/types/curriculum-import";

function importPath(courseId: string): string {
  return `/instructor/courses/${encodeURIComponent(courseId)}/curriculum-imports`;
}

export function fetchEducationPolicy(
  context: { educationLevel: EducationLevel; subject: string; grade: string; schoolYear: string },
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<EducationPolicyResponse> {
  const search = new URLSearchParams({
    educationLevel: context.educationLevel,
    subject: context.subject.trim(),
    grade: context.grade.trim(),
    schoolYear: context.schoolYear.trim(),
  });
  return apiRequest<EducationPolicyResponse>(`/ai/education-policy?${search.toString()}`, {
    accessToken,
    signal,
    cache: "no-store",
  });
}

export function createCurriculumImport(
  courseId: string,
  payload: CreateCurriculumImportPayload,
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<CurriculumImportJob> {
  const body = new FormData();
  body.append("file", payload.file);
  body.append("educationLevel", payload.educationLevel);
  body.append("subject", payload.subject.trim());
  body.append("grade", payload.grade.trim());
  body.append("curriculum", payload.curriculum.trim());
  body.append("schoolYear", payload.schoolYear.trim());
  return apiRequest<CurriculumImportJob>(importPath(courseId), {
    method: "POST",
    body,
    accessToken,
    signal,
  });
}

export function fetchCurriculumImport(
  courseId: string,
  importId: string,
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<CurriculumImportJob> {
  return apiRequest<CurriculumImportJob>(
    `${importPath(courseId)}/${encodeURIComponent(importId)}`,
    { accessToken, signal, cache: "no-store" },
  );
}

export function applyCurriculumImport(
  courseId: string,
  importId: string,
  chapters: CurriculumImportChapter[],
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<ApplyCurriculumImportResponse> {
  return apiRequest<ApplyCurriculumImportResponse>(
    `${importPath(courseId)}/${encodeURIComponent(importId)}/apply`,
    { method: "POST", body: { chapters }, accessToken, signal },
  );
}
