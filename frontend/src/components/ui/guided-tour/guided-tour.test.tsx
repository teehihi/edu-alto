import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GuidedTour } from "./guided-tour";
import { useGuidedTour } from "./use-guided-tour";
import type { TourStep } from "./guided-tour-types";

const mockSteps: TourStep[] = [
  {
    id: "step-1",
    title: "Bước 1: Soạn câu hỏi",
    description: "Nhập nội dung câu hỏi vào ô này.",
    targetSelector: '[data-tour="test-prompt"]',
    interactiveTip: "Bạn có thể gõ thử câu hỏi.",
  },
  {
    id: "step-2",
    title: "Bước 2: Nhập phương án",
    description: "Điền các lựa chọn trả lời.",
    targetSelector: '[data-tour="test-options"]',
  },
  {
    id: "step-3",
    title: "Bước 3: Chọn đáp án đúng",
    description: "Bấm vào nút tròn trước đáp án đúng.",
    targetSelector: '[data-tour="test-correct"]',
  },
  {
    id: "step-4",
    title: "Bước 4: Thiết lập và lưu",
    description: "Cấu hình điểm đạt và nhấn **'Lưu và xuất bản'** để hoàn tất.",
    targetSelector: '[data-tour="test-settings"]',
  },
];

function TestTourConsumer() {
  const [prompt, setPrompt] = useState("");
  const { isOpen, currentStep, startTour, closeTour, completeTour, skipTour, goToStep } =
    useGuidedTour({
      steps: mockSteps,
      storageKey: "test_tour_key",
      autoStart: false,
    });

  return (
    <div>
      <button type="button" onClick={() => startTour(0)}>
        Bắt đầu hướng dẫn
      </button>

      <div data-tour="test-prompt">
        <input
          data-testid="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Nhập câu hỏi"
        />
      </div>

      <div data-tour="test-options">
        <input data-testid="option-1" placeholder="Phương án A" />
      </div>

      <div data-tour="test-correct">
        <input data-testid="radio-correct" type="radio" />
      </div>

      <div data-tour="test-settings">
        <input data-testid="passing-score" defaultValue="80" />
      </div>

      <GuidedTour
        isOpen={isOpen}
        steps={mockSteps}
        currentStep={currentStep}
        onStepChange={goToStep}
        onClose={closeTour}
        onComplete={completeTour}
        onSkip={skipTour}
      />
    </div>
  );
}

describe("GuidedTour Component", () => {
  beforeEach(() => {
    localStorage.clear();
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 200,
      height: 40,
      top: 100,
      left: 100,
      bottom: 140,
      right: 300,
      x: 100,
      y: 100,
      toJSON: () => {},
    }));
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("does not render tooltip or spotlight when tour is closed", () => {
    render(<TestTourConsumer />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Bước 1 / 4")).not.toBeInTheDocument();
  });

  it("opens tour and displays step 1 content, progress indicator, and interactive tip", async () => {
    const user = userEvent.setup();
    render(<TestTourConsumer />);

    await user.click(screen.getByRole("button", { name: "Bắt đầu hướng dẫn" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Bước 1 / 4")).toBeInTheDocument();
    expect(screen.getByText("Bước 1: Soạn câu hỏi")).toBeInTheDocument();
    expect(screen.getByText("Nhập nội dung câu hỏi vào ô này.")).toBeInTheDocument();
    expect(screen.getByText("Bạn có thể gõ thử câu hỏi.")).toBeInTheDocument();
  });

  it("advances through steps with Next button and finishes on the last step", async () => {
    const user = userEvent.setup();
    render(<TestTourConsumer />);

    await user.click(screen.getByRole("button", { name: "Bắt đầu hướng dẫn" }));
    expect(screen.getByText("Bước 1 / 4")).toBeInTheDocument();

    // Step 1 -> 2
    await user.click(screen.getByRole("button", { name: /tiếp theo/i }));
    expect(screen.getByText("Bước 2 / 4")).toBeInTheDocument();
    expect(screen.getByText("Bước 2: Nhập phương án")).toBeInTheDocument();

    // Step 2 -> 3
    await user.click(screen.getByRole("button", { name: /tiếp theo/i }));
    expect(screen.getByText("Bước 3 / 4")).toBeInTheDocument();
    expect(screen.getByText("Bước 3: Chọn đáp án đúng")).toBeInTheDocument();

    // Step 3 -> 4 (last step)
    await user.click(screen.getByRole("button", { name: /tiếp theo/i }));
    expect(screen.getByText("Bước 4 / 4")).toBeInTheDocument();
    expect(screen.getByText("Bước 4: Thiết lập và lưu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hoàn thành/i })).toBeInTheDocument();

    // Click finish
    await user.click(screen.getByRole("button", { name: /hoàn thành/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem("test_tour_key")).toBe("true");
  });

  it("allows navigating back with Quay lại button", async () => {
    const user = userEvent.setup();
    render(<TestTourConsumer />);

    await user.click(screen.getByRole("button", { name: "Bắt đầu hướng dẫn" }));
    await user.click(screen.getByRole("button", { name: /tiếp theo/i }));
    expect(screen.getByText("Bước 2 / 4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /quay lại/i }));
    expect(screen.getByText("Bước 1 / 4")).toBeInTheDocument();
  });

  it("allows skipping the tour", async () => {
    const user = userEvent.setup();
    render(<TestTourConsumer />);

    await user.click(screen.getByRole("button", { name: "Bắt đầu hướng dẫn" }));
    await user.click(screen.getByRole("button", { name: /bỏ qua hướng dẫn/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem("test_tour_key")).toBe("true");
  });

  it("allows closing the tour via Escape key", async () => {
    const user = userEvent.setup();
    render(<TestTourConsumer />);

    await user.click(screen.getByRole("button", { name: "Bắt đầu hướng dẫn" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows interacting directly with the highlighted target element without losing state", async () => {
    const user = userEvent.setup();
    render(<TestTourConsumer />);

    await user.click(screen.getByRole("button", { name: "Bắt đầu hướng dẫn" }));

    // User types directly into target input during tour step 1
    const promptInput = screen.getByTestId("prompt-input");
    await user.type(promptInput, "Thủ đô của Việt Nam là gì?");
    expect(promptInput).toHaveValue("Thủ đô của Việt Nam là gì?");

    // Advance to step 2 - data in input is preserved!
    await user.click(screen.getByRole("button", { name: /tiếp theo/i }));
    expect(screen.getByText("Bước 2 / 4")).toBeInTheDocument();
    expect(promptInput).toHaveValue("Thủ đô của Việt Nam là gì?");
  });

  it("renders emphasized text in strong tag when using bold markdown", async () => {
    const user = userEvent.setup();
    render(<TestTourConsumer />);

    await user.click(screen.getByRole("button", { name: "Bắt đầu hướng dẫn" }));
    // Step 1 -> 2 -> 3 -> 4
    await user.click(screen.getByRole("button", { name: /tiếp theo/i }));
    await user.click(screen.getByRole("button", { name: /tiếp theo/i }));
    await user.click(screen.getByRole("button", { name: /tiếp theo/i }));

    expect(screen.getByText("Bước 4 / 4")).toBeInTheDocument();
    const strongEl = screen.getByText("'Lưu và xuất bản'");
    expect(strongEl.tagName).toBe("STRONG");
    expect(strongEl).toHaveClass("font-semibold");
  });
});
