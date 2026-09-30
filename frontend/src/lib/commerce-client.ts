import { apiRequest } from "@/lib/api";

export type CheckoutOrder = {
  orderId: string;
  status: "PENDING_PAYMENT" | "PAYMENT_REVIEW";
  currency: "VND";
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentUrl: string | null;
  instructions: PaymentInstructions | null;
};

export type PaymentMethod = "VNPAY" | "MOMO" | "VIETQR";

export type PaymentInstructions = {
  kind: "BANK_TRANSFER" | "MOMO_TRANSFER";
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
  total: number;
  createdAt: string;
  items: { courseId: string; title: string; unitPrice: number }[];
};

export async function createCheckoutOrder(
  accessToken: string,
  courseIds: string[],
  paymentMethod: PaymentMethod,
  phoneNumber: string,
) {
  return apiRequest<CheckoutOrder>("/me/orders", {
    method: "POST",
    accessToken,
    body: { courseIds, paymentMethod, phoneNumber },
  });
}

export async function fetchOrderDetails(accessToken: string, orderId: string) {
  return apiRequest<OrderDetails>(`/me/orders/${encodeURIComponent(orderId)}`, { accessToken });
}
