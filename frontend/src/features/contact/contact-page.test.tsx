import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContactPage } from "./contact-page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/contact",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/layout/app-header", () => ({
  AppHeader: () => <div data-testid="app-header" />,
}));

vi.mock("@/components/layout/footer", () => ({
  Footer: () => <div data-testid="footer" />,
}));

describe("ContactPage", () => {
  it("renders contact header, form, contact details and map", () => {
    render(<ContactPage />);

    expect(
      screen.getByRole("heading", { name: /kết nối với edualto/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Để lại lời nhắn cho chúng tôi")).toBeInTheDocument();
    expect(
      screen.getByText(
        "HCM-UTE, 01 Võ Văn Ngân, phường Linh Chiểu, thành phố Thủ Đức, TP. Hồ Chí Minh",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("+84 931.65.2105")).toBeInTheDocument();
    expect(screen.getByText("vanhau123w@gmail.com")).toBeInTheDocument();
  });

  it("validates empty form inputs and displays error messages", async () => {
    const user = userEvent.setup();
    render(<ContactPage />);

    const submitBtn = screen.getByRole("button", { name: /send/i });
    await user.click(submitBtn);

    expect(await screen.findByText("Vui lòng nhập họ và tên của bạn")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập email")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập nội dung lời nhắn")).toBeInTheDocument();
  });

  it("submits the contact form successfully and shows confirmation modal", async () => {
    const user = userEvent.setup();
    render(<ContactPage />);

    await user.type(screen.getByPlaceholderText(/nguyễn nhật thiên/i), "Nguyễn Nhật Thiên");
    await user.type(screen.getByPlaceholderText(/toahith@vng.com.vn/i), "toahith@vng.com.vn");
    await user.type(
      screen.getByPlaceholderText(/nhập nội dung thắc mắc/i),
      "Tôi muốn tìm hiểu khóa học Spring Boot.",
    );

    const submitBtn = screen.getByRole("button", { name: /send/i });
    await user.click(submitBtn);

    expect(await screen.findByText("Đã gửi lời nhắn thành công!")).toBeInTheDocument();
  });
});
