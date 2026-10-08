import { apiRequest } from "@/lib/api";

export type CheckoutOrder = {
  orderId: string;
  status: "PENDING_PAYMENT" | "PAYMENT_REVIEW";
  currency: "VND";
  subtotal: number;
  discountTotal: number;
  total: number;
  expiresAt: string | null;
  paymentMethod: PaymentMethod;
  paymentUrl: string | null;
  instructions: PaymentInstructions | null;
};

export type PaymentMethod = "VNPAY" | "MOMO" | "SEPAY" | "STRIPE" | "VIETQR";

export type PaymentInstructions = {
  kind: "BANK_TRANSFER" | "MOMO_TRANSFER" | "SEPAY_TRANSFER";
  recipientName: string;
  accountNumber: string | null;
  bankName: string | null;
  walletPhone: string | null;
  amount: number;
  transferReference: string;
  qrUrl: string | null;
};

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_REVIEW"
  | "PAID"
  | "PAYMENT_FAILED"
  | "CANCELLED"
  | "EXPIRED";

export type OrderDetails = {
  orderId: string;
  status: OrderStatus;
  currency: "VND";
  subtotal: number;
  discountTotal: number;
  total: number;
  createdAt: string;
  expiresAt: string | null;
  paymentReviewReason: string | null;
  items: {
    courseId: string;
    title: string;
    unitPrice: number;
    listPrice: number;
    discountAmount: number;
    promotionCode: string | null;
  }[];
};

export async function createCheckoutOrder(
  accessToken: string,
  courseIds: string[],
  paymentMethod: PaymentMethod,
  phoneNumber: string,
  promotionCode?: string,
) {
  return apiRequest<CheckoutOrder>("/me/orders", {
    method: "POST",
    accessToken,
    body: {
      courseIds,
      paymentMethod,
      phoneNumber,
      promotionCode: promotionCode?.trim() || undefined,
    },
  });
}

export async function fetchOrderDetails(accessToken: string, orderId: string) {
  return apiRequest<OrderDetails>(`/me/orders/${encodeURIComponent(orderId)}`, { accessToken });
}
