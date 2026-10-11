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
  const response = await apiRequest<{
    courseId: string;
    courseTitle: string;
    courseSlug: string;
    totalSections: number;
    totalLessons: number;
    totalDurationSeconds: number;
    sections: Array<{
      id: string;
      title: string;
      introduction?: string | null;
      description: string | null;
      metaTitle?: string | null;
      metaDescription?: string | null;
      position: number;
      lessonCount: number;
      totalDurationSeconds: number;
      lessons: Array<{
        id: string;
        title: string;
        description: string | null;
        content: string | null;
        lessonType: Lesson["type"];
        position: number;
        durationSeconds: number | null;
        isPreview: boolean;
        status: Lesson["status"];
        objectives: string[];
        attachments?: Lesson["attachments"];
      }>;
    }>;
  }>(`/instructor/courses/${courseId}/structure`, {
    accessToken,
  });
  return {
    ...response,
    sections: response.sections.map((section) => ({
      ...section,
      totalLessons: section.lessonCount,
      lessons: section.lessons.map((lesson) => ({
        ...lesson,
        sectionId: section.id,
        type: lesson.lessonType,
        textContent: lesson.content,
        videoDurationSeconds: lesson.durationSeconds,
      })),
    })),
  };
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
  const { type, textContent, videoDurationSeconds, ...lessonFields } = payload;
  return apiRequest<Lesson>(`/instructor/courses/${courseId}/sections/${sectionId}/lessons`, {
    method: "POST",
    body: {
      ...lessonFields,
      lessonType: type,
      content: textContent,
      durationSeconds: videoDurationSeconds,
    },
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
  const { type, textContent, videoDurationSeconds, ...lessonFields } = payload;
  return apiRequest<Lesson>(
    `/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`,
    {
      method: "PUT",
      body: {
        ...lessonFields,
        lessonType: type,
        content: textContent,
        durationSeconds: videoDurationSeconds,
      },
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
