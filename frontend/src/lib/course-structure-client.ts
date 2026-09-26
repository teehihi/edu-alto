import { apiRequest } from "@/lib/api";
import type {
  CourseStructure,
  CreateLessonPayload,
  CreateSectionPayload,
  Lesson,
  ReorderLessonsPayload,
  ReorderSectionsPayload,
  Section,
  UpdateLessonPayload,
  UpdateSectionPayload,
} from "@/types/course-structure";

export async function fetchCourseStructure(
  courseId: string,
  accessToken?: string | null,
): Promise<CourseStructure> {
  return apiRequest<CourseStructure>(`/instructor/courses/${courseId}/structure`, {
    accessToken,
  });
}

export async function fetchSections(
  courseId: string,
  accessToken?: string | null,
): Promise<Section[]> {
  return apiRequest<Section[]>(`/instructor/courses/${courseId}/sections`, {
    accessToken,
  });
}

export async function createSection(
  courseId: string,
  payload: CreateSectionPayload,
  accessToken?: string | null,
): Promise<Section> {
  return apiRequest<Section>(`/instructor/courses/${courseId}/sections`, {
    method: "POST",
    body: payload,
    accessToken,
  });
}

export async function updateSection(
  courseId: string,
  sectionId: string,
  payload: UpdateSectionPayload,
  accessToken?: string | null,
): Promise<Section> {
  return apiRequest<Section>(`/instructor/courses/${courseId}/sections/${sectionId}`, {
    method: "PUT",
    body: payload,
    accessToken,
  });
}

export async function deleteSection(
  courseId: string,
  sectionId: string,
  accessToken?: string | null,
): Promise<void> {
  return apiRequest<void>(`/instructor/courses/${courseId}/sections/${sectionId}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function reorderSections(
  courseId: string,
  payload: ReorderSectionsPayload,
  accessToken?: string | null,
): Promise<Section[]> {
  return apiRequest<Section[]>(`/instructor/courses/${courseId}/sections/reorder`, {
    method: "PUT",
    body: payload,
    accessToken,
  });
}

export async function fetchLessons(
  courseId: string,
  sectionId: string,
  accessToken?: string | null,
): Promise<Lesson[]> {
  return apiRequest<Lesson[]>(`/instructor/courses/${courseId}/sections/${sectionId}/lessons`, {
    accessToken,
  });
}

export async function createLesson(
  courseId: string,
  sectionId: string,
  payload: CreateLessonPayload,
  accessToken?: string | null,
): Promise<Lesson> {
  return apiRequest<Lesson>(`/instructor/courses/${courseId}/sections/${sectionId}/lessons`, {
    method: "POST",
    body: payload,
    accessToken,
  });
}

export async function updateLesson(
  courseId: string,
  sectionId: string,
  lessonId: string,
  payload: UpdateLessonPayload,
  accessToken?: string | null,
): Promise<Lesson> {
  return apiRequest<Lesson>(
    `/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`,
    {
      method: "PUT",
      body: payload,
      accessToken,
    },
  );
}

export async function deleteLesson(
  courseId: string,
  sectionId: string,
  lessonId: string,
  accessToken?: string | null,
): Promise<void> {
  return apiRequest<void>(
    `/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`,
    {
      method: "DELETE",
      accessToken,
    },
  );
}

export async function reorderLessons(
  courseId: string,
  sectionId: string,
  payload: ReorderLessonsPayload,
  accessToken?: string | null,
): Promise<Lesson[]> {
  return apiRequest<Lesson[]>(
    `/instructor/courses/${courseId}/sections/${sectionId}/lessons/reorder`,
    {
      method: "PUT",
      body: payload,
      accessToken,
    },
  );
}
