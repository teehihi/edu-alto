import type { CartCourse } from "@/lib/cart";
import type { CheckoutOrder, PaymentMethod } from "@/lib/commerce-client";

const PENDING_ORDER_KEY = "edualto:pending_checkout:v1";
const CART_BACKUP_KEY = "edualto:cart_backup:v1";

export type PendingCheckoutSession = {
  order: CheckoutOrder;
  courseIds: string[];
  courses: CartCourse[];
  phoneNumber: string;
  promotionCode?: string;
  paymentMethod: PaymentMethod;
  savedAt: number;
};

export function savePendingCheckoutSession(
  order: CheckoutOrder,
  courses: CartCourse[],
  phoneNumber: string,
  paymentMethod: PaymentMethod,
  promotionCode?: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const session: PendingCheckoutSession = {
      order,
      courseIds: courses.map((c) => c.id),
      courses,
      phoneNumber,
      promotionCode,
      paymentMethod,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(session));
  } catch (err) {
    console.error("Failed to save pending checkout session", err);
  }
}

export function getPendingCheckoutSession(): PendingCheckoutSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_ORDER_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as PendingCheckoutSession;
    if (!session || !session.order) {
      clearPendingCheckoutSession();
      return null;
    }
    // Check if order has expired
    if (session.order.expiresAt) {
      const expiry = new Date(session.order.expiresAt).getTime();
      if (Date.now() > expiry) {
        clearPendingCheckoutSession();
        return null;
      }
    }
    return session;
  } catch {
    clearPendingCheckoutSession();
    return null;
  }
}

export function clearPendingCheckoutSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_ORDER_KEY);
  } catch {
    // ignore
  }
}

export function backupCart(courses: CartCourse[]): void {
  if (typeof window === "undefined" || !courses.length) return;
  try {
    window.localStorage.setItem(CART_BACKUP_KEY, JSON.stringify(courses));
  } catch {
    // ignore
  }
}

export function restoreCartFromBackup(): CartCourse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_BACKUP_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartCourse[];
  } catch {
    return [];
  }
}

export function clearCartBackup(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CART_BACKUP_KEY);
  } catch {
    // ignore
  }
}
