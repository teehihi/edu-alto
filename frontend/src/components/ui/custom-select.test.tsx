import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { CustomSelect } from "./custom-select";

describe("CustomSelect", () => {
  const options = [
    { value: "relevance", label: "Độ liên quan" },
    { value: "name", label: "Tên giảng viên" },
    { value: "recent", label: "Mới tham gia" },
  ];

  it("renders selected option label and opens dropdown on click", () => {
    const handleChange = vi.fn();

    render(<CustomSelect value="relevance" onChange={handleChange} options={options} />);

    const trigger = screen.getByRole("button", { name: "Độ liên quan" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Click to open
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Check options list
    const nameOption = screen.getByRole("option", { name: "Tên giảng viên" });
    expect(nameOption).toBeInTheDocument();

    // Select option
    fireEvent.click(nameOption);
    expect(handleChange).toHaveBeenCalledWith("name");
  });

  it("closes when clicking outside", () => {
    render(
      <div>
        <span data-testid="outside">Outside area</span>
        <CustomSelect value="relevance" onChange={() => {}} options={options} />
      </div>,
    );

    const trigger = screen.getByRole("button", { name: "Độ liên quan" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Click outside
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
