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

const FAVORITES_KEY = "edualto:favorite-courses";
const FAVORITES_EVENT = "edualto:favorites-changed";

export function readFavoriteCourses(): FavoriteCourse[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(FAVORITES_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((course): course is FavoriteCourse => isFavoriteCourse(course))
      : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteCourse(course: FavoriteCourse): FavoriteCourse[] {
  if (typeof window === "undefined") return [];

  const current = readFavoriteCourses();
  const next = current.some((favorite) => favorite.id === course.id)
    ? current.filter((favorite) => favorite.id !== course.id)
    : [course, ...current];

  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(FAVORITES_EVENT));
  } catch {
    // Keep the in-memory interaction usable when storage is unavailable.
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
