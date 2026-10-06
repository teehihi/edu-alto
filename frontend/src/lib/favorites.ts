import { ApiClientError, apiPageRequest, apiRequest } from "@/lib/api";

export type FavoriteCourse = {
  id: string;
  slug: string;
  title: string;
  instructor: string;
  instructorRole?: string;
  rating: number;
  reviewCount: number;
  totalHours: number;
  lecturesCount: number;
  level: string;
  price: number;
  originalPrice?: number;
  image: string;
};

type FavoriteCourseResponse = {
  id: string;
  title: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  level: string;
  thumbnailUrl: string | null;
  instructor: { fullName: string; headline: string | null };
};

const FAVORITES_KEY = "edualto:favorite-courses";
const FAVORITES_EVENT = "edualto:favorites-changed";
const remoteIdsByUser = new Map<string, Set<string>>();
const remoteLoadsByUser = new Map<string, Promise<Set<string>>>();

const EMPTY_FAVORITES: FavoriteCourse[] = [];
let cachedRawValue: string | null = null;
let cachedFavoriteCourses: FavoriteCourse[] = EMPTY_FAVORITES;

export function getFavoriteCoursesServerSnapshot(): FavoriteCourse[] {
  return EMPTY_FAVORITES;
}

export function readFavoriteCourses(): FavoriteCourse[] {
  if (typeof window === "undefined") return EMPTY_FAVORITES;

  try {
    const stored = window.localStorage.getItem(FAVORITES_KEY);
    if (!stored) {
      cachedRawValue = null;
      cachedFavoriteCourses = EMPTY_FAVORITES;
      return EMPTY_FAVORITES;
    }
    if (stored === cachedRawValue) {
      return cachedFavoriteCourses;
    }
    const parsed: unknown = JSON.parse(stored);
    cachedRawValue = stored;
    cachedFavoriteCourses = Array.isArray(parsed)
      ? parsed.filter((course): course is FavoriteCourse => isFavoriteCourse(course))
      : EMPTY_FAVORITES;
    return cachedFavoriteCourses;
  } catch {
    cachedRawValue = null;
    cachedFavoriteCourses = EMPTY_FAVORITES;
    return EMPTY_FAVORITES;
  }
}

export function toggleFavoriteCourse(course: FavoriteCourse): FavoriteCourse[] {
  if (typeof window === "undefined") return EMPTY_FAVORITES;

  const current = readFavoriteCourses();
  const next = current.some((favorite) => favorite.id === course.id)
    ? current.filter((favorite) => favorite.id !== course.id)
    : [course, ...current];

  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(FAVORITES_KEY, raw);
    cachedRawValue = raw;
    cachedFavoriteCourses = next;
    window.dispatchEvent(new Event(FAVORITES_EVENT));
  } catch {
    // Keep the in-memory interaction usable when storage is unavailable.
    cachedFavoriteCourses = next;
  }

  return next;
}

export function subscribeToFavoriteCourses(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(FAVORITES_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(FAVORITES_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function getCachedFavoriteCourseIds(userId: string): Set<string> | undefined {
  return remoteIdsByUser.get(userId);
}

export async function loadFavoriteCoursesForUser(
  userId: string,
  accessToken: string,
): Promise<Set<string>> {
  const cached = remoteIdsByUser.get(userId);
  if (cached) return cached;
  const pending = remoteLoadsByUser.get(userId);
  if (pending) return pending;

  const load = (async () => {
    const guestFavorites = readFavoriteCourses();
    await Promise.all(
      guestFavorites.map((course) =>
        apiRequest<void>(`/me/favorite-courses/${encodeURIComponent(course.id)}`, {
          method: "PUT",
          accessToken,
        }).catch((cause: unknown) => {
          if (cause instanceof ApiClientError && cause.status === 404) return;
          throw cause;
        }),
      ),
    );
    if (guestFavorites.length > 0) {
      try {
        window.localStorage.removeItem(FAVORITES_KEY);
        cachedRawValue = null;
        cachedFavoriteCourses = EMPTY_FAVORITES;
      } catch {
        // The server copy remains authoritative when local storage is unavailable.
      }
    }

    const saved = await fetchFavoriteCourses(accessToken);
    const ids = new Set(saved.map((course) => course.id));
    remoteIdsByUser.set(userId, ids);
    window.dispatchEvent(new Event(FAVORITES_EVENT));
    return ids;
  })();
  remoteLoadsByUser.set(userId, load);
  try {
    return await load;
  } finally {
    remoteLoadsByUser.delete(userId);
  }
}

export async function fetchFavoriteCourses(accessToken: string): Promise<FavoriteCourse[]> {
  const courses: FavoriteCourseResponse[] = [];
  let page = 0;
  let totalPages = 1;
  do {
    const result = await apiPageRequest<FavoriteCourseResponse>(
      `/me/favorite-courses?page=${page}&size=100`,
      { accessToken },
    );
    courses.push(...result.data);
    totalPages = result.meta.totalPages;
    page += 1;
  } while (page < totalPages);

  return courses.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    instructor: course.instructor.fullName,
    instructorRole: course.instructor.headline ?? undefined,
    rating: 0,
    reviewCount: 0,
    totalHours: 0,
    lecturesCount: 0,
    level:
      course.level === "BEGINNER"
        ? "Cơ bản"
        : course.level === "INTERMEDIATE"
          ? "Trung cấp"
          : course.level === "ADVANCED"
            ? "Nâng cao"
            : "Tất cả trình độ",
    price: course.price,
    originalPrice: course.originalPrice ?? undefined,
    image: course.thumbnailUrl || "/images/logo-with-text.png",
  }));
}

export async function setRemoteFavoriteCourse(
  userId: string,
  courseId: string,
  accessToken: string,
  favorite: boolean,
): Promise<void> {
  await apiRequest<void>(`/me/favorite-courses/${encodeURIComponent(courseId)}`, {
    method: favorite ? "PUT" : "DELETE",
    accessToken,
  });
  const ids = new Set(remoteIdsByUser.get(userId) ?? []);
  if (favorite) ids.add(courseId);
  else ids.delete(courseId);
  remoteIdsByUser.set(userId, ids);
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

function isFavoriteCourse(value: unknown): value is FavoriteCourse {
  if (typeof value !== "object" || value === null) return false;
  const course = value as Partial<FavoriteCourse>;
  return (
    typeof course.id === "string" &&
    typeof course.slug === "string" &&
    typeof course.title === "string" &&
    typeof course.instructor === "string" &&
    typeof course.rating === "number" &&
    typeof course.reviewCount === "number" &&
    typeof course.totalHours === "number" &&
    typeof course.lecturesCount === "number" &&
    typeof course.level === "string" &&
    typeof course.price === "number" &&
    typeof course.image === "string"
  );
}
