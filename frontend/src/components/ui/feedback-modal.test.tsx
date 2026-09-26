import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { vi } from "vitest";
import { FeedbackModal } from "./feedback-modal";

describe("FeedbackModal", () => {
  it("does not render when isOpen is false", () => {
    render(<FeedbackModal isOpen={false} onClose={vi.fn()} title="Cập nhật thành công!" />);
    expect(screen.queryByText("Cập nhật thành công!")).not.toBeInTheDocument();
  });

  it("renders title, description and triggers onClose when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <FeedbackModal
        isOpen={true}
        onClose={handleClose}
        title="Cập nhật thông tin hồ sơ thành công!"
        description="Dữ liệu cá nhân của bạn đã được cập nhật thành công."
        confirmText="Xác nhận"
      />,
    );

    expect(screen.getByText("Cập nhật thông tin hồ sơ thành công!")).toBeInTheDocument();
    expect(
      screen.getByText("Dữ liệu cá nhân của bạn đã được cập nhật thành công."),
    ).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: "Xác nhận" });
    await user.click(confirmButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("closes when pressing Escape key", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(<FeedbackModal isOpen={true} onClose={handleClose} title="Thông báo" />);

    await user.keyboard("{Escape}");
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
