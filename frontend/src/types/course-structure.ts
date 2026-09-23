export type LessonType = "TEXT" | "VIDEO" | "DOCUMENT" | "QUIZ" | "ASSIGNMENT";

export type LessonStatus = "DRAFT" | "PUBLISHED";

export type Section = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type Lesson = {
  id: string;
  sectionId: string;
  title: string;
  description: string | null;
  type: LessonType;
  textContent: string | null;
  videoDurationSeconds: number | null;
  isPreview: boolean;
  status: LessonStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type CourseStructureSection = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  totalLessons: number;
  totalDurationSeconds: number;
  lessons: Lesson[];
};

export type CourseStructure = {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  totalSections: number;
  totalLessons: number;
  totalDurationSeconds: number;
  sections: CourseStructureSection[];
};

export type CreateSectionPayload = {
  title: string;
  description?: string | null;
};

export type UpdateSectionPayload = {
  title?: string;
  description?: string | null;
};

export type ReorderItem = {
  id: string;
  position: number;
};

export type ReorderSectionsPayload = {
  items: ReorderItem[];
};

export type CreateLessonPayload = {
  title: string;
  description?: string | null;
  type?: LessonType;
  textContent?: string | null;
  videoDurationSeconds?: number | null;
  isPreview?: boolean;
  status?: LessonStatus;
};

export type UpdateLessonPayload = {
  title?: string;
  description?: string | null;
  type?: LessonType;
  textContent?: string | null;
  videoDurationSeconds?: number | null;
  isPreview?: boolean;
  status?: LessonStatus;
};

export type ReorderLessonsPayload = {
  items: ReorderItem[];
};
