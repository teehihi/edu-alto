import { apiPageRequest, apiRequest, type PageResult } from "@/lib/api";
import type {
  CourseCurriculum,
  LessonPreview,
  CourseDetail,
  CourseLevel,
  CourseListItem,
} from "@/types/course";

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

const courseCache = new Map<string, { data: CourseDetail; timestamp: number }>();
const curriculumCache = new Map<string, { data: CourseCurriculum; timestamp: number }>();
const coursePageCache = new Map<string, { data: PageResult<CourseListItem>; timestamp: number }>();

const CACHE_TTL_MS = 60_000; // 60s memory cache for smooth navigation & bfcache

function buildCourseQueryPath(params: CourseQueryParams = {}) {
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
  return `/courses${qs ? `?${qs}` : ""}`;
}

export function getCachedCourseDetail(slug: string): CourseDetail | null {
  const hit = courseCache.get(slug);
  if (hit && Date.now() - hit.timestamp < CACHE_TTL_MS) {
    return hit.data;
  }
  return null;
}

export function getCachedCurriculum(slug: string): CourseCurriculum | null {
  const hit = curriculumCache.get(slug);
  if (hit && Date.now() - hit.timestamp < CACHE_TTL_MS) {
    return hit.data;
  }
  return null;
}

export function getCachedCoursePage(
  params: CourseQueryParams = {},
): PageResult<CourseListItem> | null {
  const path = buildCourseQueryPath(params);
  const hit = coursePageCache.get(path);
  if (hit && Date.now() - hit.timestamp < CACHE_TTL_MS) {
    return hit.data;
  }
  return null;
}

export async function fetchPublicCoursePage(params: CourseQueryParams = {}) {
  const path = buildCourseQueryPath(params);
  const result = await apiPageRequest<CourseListItem>(path);
  coursePageCache.set(path, { data: result, timestamp: Date.now() });
  return result;
}

export async function fetchPublicCourses(
  params: CourseQueryParams = {},
): Promise<CourseListItem[]> {
  return (await fetchPublicCoursePage(params)).data;
}

export async function fetchPublicCourseBySlug(slug: string): Promise<CourseDetail> {
  const result = await apiRequest<CourseDetail>(`/courses/${encodeURIComponent(slug)}`);
  courseCache.set(slug, { data: result, timestamp: Date.now() });
  return result;
}

export async function fetchPublicCurriculum(slug: string) {
  const result = await apiRequest<CourseCurriculum>(
    `/courses/${encodeURIComponent(slug)}/curriculum`,
  );
  curriculumCache.set(slug, { data: result, timestamp: Date.now() });
  return result;
}

export async function fetchLessonPreview(slug: string, lessonId: string) {
  return apiRequest<LessonPreview>(
    `/courses/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(lessonId)}/preview`,
  );
}
