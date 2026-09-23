import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AboutPage } from "./about-page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/about",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/components/layout/app-header", () => ({
  AppHeader: () => <div data-testid="app-header" />
}));

vi.mock("@/components/layout/footer", () => ({
  Footer: () => <div data-testid="footer" />
}));

describe("AboutPage", () => {
  it("renders about heading, intro, feature section and benefits grid", () => {
    render(<AboutPage />);

    expect(screen.getByRole("heading", { name: /về chúng tôi/i, level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Mang đến trải nghiệm/i)).toBeInTheDocument();
    expect(screen.getByText(/Những giá trị EduAlto mang đến cho hành trình học tập của bạn/i)).toBeInTheDocument();

    expect(screen.getByText("Học Tập Linh Hoạt")).toBeInTheDocument();
    expect(screen.getByText("Tiết Kiệm Thời Gian")).toBeInTheDocument();
    expect(screen.getByText("Cá Nhân Hóa Trải Nghiệm")).toBeInTheDocument();
    expect(screen.getByText("Chi Phí Hợp Lý")).toBeInTheDocument();
    expect(screen.getByText("Nâng Cao Hiệu Quả Học Tập")).toBeInTheDocument();
    expect(screen.getByText("Tài Liệu Đa Dạng")).toBeInTheDocument();
  });

  it("opens benefit detail modal when clicking Read More", async () => {
    const user = userEvent.setup();
    render(<AboutPage />);

    const readMoreButtons = screen.getAllByRole("button", { name: /read more/i });
    await user.click(readMoreButtons[0]);

    // Modal opens
    expect(screen.getByText("Đã hiểu")).toBeInTheDocument();

    // Close modal
    await user.click(screen.getByRole("button", { name: /đã hiểu/i }));
    expect(screen.queryByText("Đã hiểu")).not.toBeInTheDocument();
  });
});
