import { apiPageRequest, apiRequest } from "@/lib/api";

export type PaymentReviewOrder = {
  orderId: string;
  status: "PAYMENT_REVIEW";
  paymentMethod: "MOMO" | "VIETQR" | string;
  transferReference: string;
  studentId: string;
  studentName: string;
  total: number;
  currency: string;
  createdAt: string;
};

export type ConfirmedOrder = {
  orderId: string;
  status: string;
  currency: string;
  total: number;
  createdAt: string;
  items: { courseId: string; title: string; unitPrice: number }[];
};

export function fetchPaymentReviewOrders(accessToken: string, page: number, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    status: "PAYMENT_REVIEW",
  });
  return apiPageRequest<PaymentReviewOrder>(`/admin/orders?${params.toString()}`, { accessToken });
}

export function confirmManualPayment(
  accessToken: string,
  orderId: string,
  receiptReference: string,
) {
  return apiRequest<ConfirmedOrder>(
    `/admin/orders/${encodeURIComponent(orderId)}/confirm-payment`,
    { method: "POST", accessToken, body: { receiptReference } },
  );
}
