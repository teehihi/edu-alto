import { apiPageRequest } from "@/lib/api";

export type InstructorCourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type InstructorCourse = {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  price: number;
  originalPrice: number | null;
  level: string;
  language: string;
  status: InstructorCourseStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type InstructorCoursePage = {
  data: InstructorCourse[];
  meta: { page: number; size: number; totalElements: number; totalPages: number };
};

export async function fetchInstructorCourses(
  accessToken?: string | null,
): Promise<InstructorCoursePage> {
  return apiPageRequest<InstructorCourse>("/instructor/courses?page=0&size=100", {
    accessToken,
  });
}
