import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getInitials, UserAvatar } from "./user-avatar";

describe("UserAvatar and getInitials", () => {
  it("computes initials correctly for Vietnamese and single/multi-word names", () => {
    expect(getInitials("Nguyễn Nhật Thiên")).toBe("NT");
    expect(getInitials("Trần Văn A")).toBe("TA");
    expect(getInitials("Thiên")).toBe("TH");
    expect(getInitials("A")).toBe("A");
    expect(getInitials("")).toBe("E");
    expect(getInitials(null)).toBe("E");
  });

  it("renders default avatar image when no avatarUrl is provided", () => {
    render(<UserAvatar name="Nguyễn Nhật Thiên" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/images/default-avatar.webp");
    expect(img).toHaveAttribute("alt", "Nguyễn Nhật Thiên");
  });

  it("renders custom image when avatarUrl is provided", () => {
    render(<UserAvatar name="Nguyễn Nhật Thiên" avatarUrl="https://example.com/avatar.jpg" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    expect(img).toHaveAttribute("alt", "Nguyễn Nhật Thiên");
  });

  it("falls back to initials when image loading fails", () => {
    render(<UserAvatar name="Nguyễn Nhật Thiên" avatarUrl="https://example.com/broken.jpg" />);
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.getByText("NT")).toBeInTheDocument();
  });
});
