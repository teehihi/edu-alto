import { apiPageRequest, apiRequest } from "@/lib/api";

export type InstructorRevenueStatus =
  | "PAID"
  | "PENDING_PAYMENT"
  | "PAYMENT_REVIEW"
  | "PAYMENT_FAILED";

export type InstructorRevenueSummary = {
  paidNetAmount: number;
  paidTransactionCount: number;
  pendingTransactionCount: number;
  periods?: Array<{ label: string; netAmount: number; previousNetAmount: number }>;
};

export type InstructorCourseRevenueSummary = InstructorRevenueSummary;

export type InstructorRevenueTransaction = {
  orderId: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
  amount: number;
  status: InstructorRevenueStatus;
  paymentMethod: string;
  createdAt: string;
};

export type RevenueDateRange = { from?: string; to?: string };

function createQuery(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function fetchInstructorRevenueSummary(accessToken: string, range: RevenueDateRange) {
  const query = createQuery(range);
  return apiRequest<InstructorRevenueSummary>(
    `/instructor/revenue/summary${query ? `?${query}` : ""}`,
    { accessToken },
  );
}

export function fetchInstructorCourseRevenueSummary(accessToken: string, courseId: string) {
  return apiRequest<InstructorCourseRevenueSummary>(
    `/instructor/revenue/courses/${encodeURIComponent(courseId)}/summary`,
    { accessToken },
  );
}

export function fetchInstructorRevenueTransactions(
  accessToken: string,
  page: number,
  search: string,
  status: InstructorRevenueStatus | "all",
  range: RevenueDateRange,
) {
  const query = createQuery({
    page: String(page),
    size: "20",
    search: search.trim() || undefined,
    status: status === "all" ? undefined : status,
    ...range,
  });
  return apiPageRequest<InstructorRevenueTransaction>(`/instructor/revenue/transactions?${query}`, {
    accessToken,
  });
}
