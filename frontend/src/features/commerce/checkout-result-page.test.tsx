import { act, render, screen } from "@testing-library/react";
import { CheckoutResultPage } from "./checkout-result-page";

const { fetchOrderMock, getAccessTokenMock, removeFromCartMock } = vi.hoisted(() => ({
  fetchOrderMock: vi.fn(),
  getAccessTokenMock: vi.fn(),
  removeFromCartMock: vi.fn(),
}));

vi.mock("next/navigation", () => {
  const router = { replace: vi.fn() };
  return {
    useRouter: () => router,
    useSearchParams: () => new URLSearchParams("vnp_TxnRef=order-1"),
  };
});
vi.mock("@/lib/auth-session", () => {
  const user = { id: "student-1" };
  return { useAuthSession: () => ({ user, isLoading: false, getAccessToken: getAccessTokenMock }) };
});
vi.mock("@/lib/commerce-client", () => ({ fetchOrderDetails: fetchOrderMock }));
vi.mock("@/lib/cart", () => ({ removeCourseFromCart: removeFromCartMock }));

const order = {
  orderId: "order-1",
  status: "PENDING_PAYMENT",
  currency: "VND",
  subtotal: 100000,
  discountTotal: 0,
  total: 100000,
  createdAt: "2026-10-04T00:00:00Z",
  expiresAt: null,
  paymentReviewReason: null,
  items: [
    {
      courseId: "course-1",
      title: "Khóa học thử nghiệm",
      unitPrice: 100000,
      listPrice: 100000,
      discountAmount: 0,
      promotionCode: null,
    },
  ],
};

describe("CheckoutResultPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    getAccessTokenMock.mockResolvedValue("token");
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates pending payments automatically and stops after confirmation", async () => {
    fetchOrderMock.mockResolvedValueOnce(order).mockResolvedValueOnce({ ...order, status: "PAID" });
    await act(async () => {
      render(<CheckoutResultPage />);
    });
    expect(screen.getByText("Đang xác nhận thanh toán")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(screen.getByText("Thanh toán thành công")).toBeInTheDocument();
    expect(removeFromCartMock).toHaveBeenCalledWith("course-1");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(fetchOrderMock).toHaveBeenCalledTimes(2);
  });

  it("cancels pending checks when leaving the page", async () => {
    fetchOrderMock.mockResolvedValue(order);
    const view = render(<CheckoutResultPage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });
    expect(fetchOrderMock).toHaveBeenCalledTimes(1);
  });
});
