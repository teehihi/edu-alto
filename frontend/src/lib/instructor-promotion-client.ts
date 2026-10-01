import { apiPageRequest, apiRequest } from "@/lib/api";

export type PromotionDiscountType = "PERCENT" | "FIXED";

export type PromotionStatus = "SCHEDULED" | "ACTIVE" | "DISABLED" | "EXPIRED" | "EXHAUSTED";

export type InstructorPromotion = {
  id: string;
  courseId: string;
  name: string;
  code: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  redeemedAmount: number;
  startsAt: string;
  endsAt: string;
  status: PromotionStatus;
};

export type InstructorPromotionInput = {
  name: string;
  code: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  maxRedemptions: number | null;
  startsAt: string;
  endsAt: string;
  status?: "ACTIVE" | "DISABLED";
};

export type InstructorPromotionSummary = {
  totalPromotionCount: number;
  redeemedCount: number;
  redeemedAmount: number;
  periods?: Array<{ label: string; redeemedCount: number; redeemedAmount: number }>;
};

export function fetchCoursePromotions(
  courseId: string,
  accessToken: string,
  page: number,
  search: string,
  status: PromotionStatus | "all",
) {
  const params = new URLSearchParams({ page: String(page), size: "10" });
  if (search.trim()) params.set("search", search.trim());
  if (status !== "all") params.set("status", status);
  return apiPageRequest<InstructorPromotion>(
    `/instructor/courses/${encodeURIComponent(courseId)}/promotions?${params.toString()}`,
    { accessToken },
  );
}

export function fetchCoursePromotionSummary(courseId: string, accessToken: string) {
  return apiRequest<InstructorPromotionSummary>(
    `/instructor/courses/${encodeURIComponent(courseId)}/promotions/summary`,
    { accessToken },
  );
}

export function createCoursePromotion(
  courseId: string,
  payload: InstructorPromotionInput,
  accessToken: string,
) {
  return apiRequest<InstructorPromotion>(
    `/instructor/courses/${encodeURIComponent(courseId)}/promotions`,
    { method: "POST", body: payload, accessToken },
  );
}

export function updateCoursePromotion(
  promotionId: string,
  payload: InstructorPromotionInput,
  accessToken: string,
) {
  return apiRequest<InstructorPromotion>(
    `/instructor/promotions/${encodeURIComponent(promotionId)}`,
    { method: "PATCH", body: payload, accessToken },
  );
}
