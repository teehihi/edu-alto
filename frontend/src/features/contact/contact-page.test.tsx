import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactPage } from "./contact-page";
import * as apiModule from "@/lib/api";
import { ApiClientError } from "@/lib/api";

vi.mock("@/components/layout/app-header", () => ({
  AppHeader: () => <header data-testid="app-header" />,
}));

vi.mock("@/components/layout/footer", () => ({
  Footer: () => <footer data-testid="footer" />,
}));

describe("ContactPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Vietnamese submit button and validates required fields in Vietnamese", async () => {
    const user = userEvent.setup();
    render(<ContactPage />);

    const submitButton = screen.getByRole("button", { name: "Gửi lời nhắn" });
    expect(submitButton).toBeInTheDocument();

    await user.click(submitButton);

    expect(await screen.findByText("Vui lòng nhập họ và tên của bạn")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập email")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập nội dung lời nhắn")).toBeInTheDocument();
  });

  it("submits valid payload to POST /contact and shows success modal", async () => {
    const user = userEvent.setup();
    const apiSpy = vi.spyOn(apiModule, "apiRequest").mockResolvedValue({
      id: "msg-1",
      status: "NEW",
      createdAt: "2026-11-12T10:00:00Z",
    });

    render(<ContactPage />);

    await user.type(screen.getByLabelText(/Họ và Tên/i), "Nguyễn Nhật Thiên");
    await user.type(screen.getByLabelText(/Email/i), "thien@edualto.vn");
    await user.type(
      screen.getByLabelText(/Lời nhắn của bạn/i),
      "Tôi cần tư vấn lộ trình học React và Spring Boot.",
    );

    await user.click(screen.getByRole("button", { name: "Gửi lời nhắn" }));

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith("/contact", {
        method: "POST",
        body: {
          fullName: "Nguyễn Nhật Thiên",
          email: "thien@edualto.vn",
          message: "Tôi cần tư vấn lộ trình học React và Spring Boot.",
        },
      });
    });

    expect(await screen.findByText("Đã gửi lời nhắn thành công!")).toBeInTheDocument();
  });

  it("displays friendly Vietnamese error banner when API request fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule, "apiRequest").mockRejectedValue(
      new ApiClientError(429, {
        code: "CONTACT_RATE_LIMIT_EXCEEDED",
        message: "Bạn đã gửi quá nhiều lời nhắn. Vui lòng thử lại sau ít phút.",
        details: [],
      }),
    );

    render(<ContactPage />);

    await user.type(screen.getByLabelText(/Họ và Tên/i), "Trần Minh Khoa");
    await user.type(screen.getByLabelText(/Email/i), "khoa@edualto.vn");
    await user.type(
      screen.getByLabelText(/Lời nhắn của bạn/i),
      "Xin hỗ trợ kiểm tra trạng thái đơn hàng giúp tôi.",
    );

    await user.click(screen.getByRole("button", { name: "Gửi lời nhắn" }));

    expect(
      await screen.findByText("Bạn đã gửi quá nhiều lời nhắn. Vui lòng thử lại sau ít phút."),
    ).toBeInTheDocument();
  });

  it("masks 500 server errors with friendly Vietnamese copy", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule, "apiRequest").mockRejectedValue(
      new ApiClientError(500, {
        code: "INTERNAL_SERVER_ERROR",
        message: "Raw backend error",
        details: [],
      }),
    );

    render(<ContactPage />);

    await user.type(screen.getByLabelText(/Họ và Tên/i), "Trần Minh Khoa");
    await user.type(screen.getByLabelText(/Email/i), "khoa@edualto.vn");
    await user.type(
      screen.getByLabelText(/Lời nhắn của bạn/i),
      "Xin hỗ trợ kiểm tra trạng thái đơn hàng giúp tôi.",
    );

    await user.click(screen.getByRole("button", { name: "Gửi lời nhắn" }));

    expect(
      await screen.findByText("Hệ thống đang bận, vui lòng thử lại sau ít phút."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Raw backend error")).not.toBeInTheDocument();
  });
});
