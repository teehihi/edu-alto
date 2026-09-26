export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isOtp(value: string) {
  return /^\d{6}$/.test(value.trim());
}

export function getFriendlyError(error: unknown, fallback = "Đã có lỗi xảy ra. Vui lòng thử lại.") {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
      return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.";
    }
    if (/axios|network|stack|exception|500|401|403/i.test(error.message)) {
      return fallback;
    }

    return error.message;
  }

  return fallback;
}

export function hasLetterAndDigit(value: string) {
  return /^(?=.*[a-zA-Z])(?=.*\d).+$/.test(value);
}

export function extractFieldErrors<T extends string>(error: unknown): FieldErrors<T> | null {
  if (
    error &&
    typeof error === "object" &&
    "details" in error &&
    Array.isArray((error as { details?: unknown }).details)
  ) {
    const details = (error as { details: Array<{ field?: string; message?: string }> }).details;
    if (details.length > 0) {
      const fieldErrors: FieldErrors<T> = {};
      for (const item of details) {
        if (item.field && item.message) {
          fieldErrors[item.field as T] = item.message;
        }
      }
      return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
    }
  }
  return null;
}

export function sanitizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}
