export type CourseLevel = "ALL_LEVELS" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type CourseInstructorSummary = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  headline: string | null;
  customHandle: string | null;
};

export type CourseListItem = {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  thumbnailUrl: string | null;
  price: number;
  originalPrice: number | null;
  level: CourseLevel;
  language: string;
  status: CourseStatus;
  publishedAt: string | null;
  instructor: CourseInstructorSummary | null;
};

export type CourseDetail = {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  description: string;
  thumbnailUrl: string | null;
  price: number;
  originalPrice: number | null;
  level: CourseLevel;
  language: string;
  status: CourseStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  instructor: CourseInstructorSummary | null;
};

export type CourseCurriculum = {
  courseId: string;
  slug: string;
  sections: {
    id: string;
    title: string;
    introduction?: string | null;
    description?: string | null;
    lessons: {
      id: string;
      title: string;
      lessonType: string;
      durationSeconds: number | null;
      preview: boolean;
    }[];
  }[];
};

export type LessonPreview = {
  id: string;
  title: string;
  lessonType: string;
  textContent: string | null;
};
