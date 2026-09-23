import { apiRequest } from "@/lib/api";
import type { CourseDetail, CourseLevel, CourseListItem } from "@/types/course";

export type CourseQueryParams = {
  keyword?: string;
  level?: CourseLevel;
  minPrice?: number;
  maxPrice?: number;
  isFree?: boolean;
  language?: string;
  instructorId?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "title_asc";
  page?: number;
  size?: number;
};

export async function fetchPublicCourses(params: CourseQueryParams = {}): Promise<CourseListItem[]> {
  const query = new URLSearchParams();
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.level) query.set("level", params.level);
  if (params.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));
  if (params.isFree !== undefined) query.set("isFree", String(params.isFree));
  if (params.language) query.set("language", params.language);
  if (params.instructorId) query.set("instructorId", params.instructorId);
  if (params.sort) query.set("sort", params.sort);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.size !== undefined) query.set("size", String(params.size));

  const qs = query.toString();
  const path = `/courses${qs ? `?${qs}` : ""}`;
  return apiRequest<CourseListItem[]>(path);
}

export async function fetchPublicCourseBySlug(slug: string): Promise<CourseDetail> {
  return apiRequest<CourseDetail>(`/courses/${encodeURIComponent(slug)}`);
}
