export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isOtp(value: string) {
  return /^\d{6}$/.test(value.trim());
}

export function getFriendlyError(error: unknown, fallback = "Đã có lỗi xảy ra. Vui lòng thử lại.") {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    if (/axios|network|stack|exception|500|401|403/i.test(error.message)) {
      return fallback;
    }

    return error.message;
  }

  return fallback;
}

export function sanitizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}
