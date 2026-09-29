export type CartCourse = {
  id: string;
  slug: string;
  title: string;
  price: number;
  thumbnailUrl: string | null;
  instructorName: string;
};

const STORAGE_KEY = "edualto:cart:v1";

export function readCart(): CartCourse[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const items: unknown = JSON.parse(stored);
    if (!Array.isArray(items)) return [];
    return items.filter(isCartCourse);
  } catch {
    return [];
  }
}

export function addCourseToCart(course: CartCourse): CartCourse[] {
  const current = readCart();
  if (current.some((item) => item.id === course.id)) return current;
  const next = [...current, course];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("edualto:cart-changed"));
  return next;
}

export function removeCourseFromCart(courseId: string): CartCourse[] {
  const next = readCart().filter((item) => item.id !== courseId);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("edualto:cart-changed"));
  return next;
}

export function clearCart() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("edualto:cart-changed"));
}

function isCartCourse(value: unknown): value is CartCourse {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.slug === "string" &&
    typeof item.title === "string" &&
    typeof item.price === "number" &&
    (typeof item.thumbnailUrl === "string" || item.thumbnailUrl === null) &&
    typeof item.instructorName === "string"
  );
}
