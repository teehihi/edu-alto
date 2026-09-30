import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LearningQuizContent } from "./learning-quiz-content";

const { fetchQuizMock, submitQuizMock } = vi.hoisted(() => ({
  fetchQuizMock: vi.fn(),
  submitQuizMock: vi.fn(),
}));

vi.mock("@/lib/learning-client", () => ({
  fetchLearningQuiz: fetchQuizMock,
  submitLearningQuiz: submitQuizMock,
}));

const quiz = {
  id: "quiz-1",
  lessonId: "lesson-1",
  passingScore: 70,
  questions: [
    {
      id: "question-1",
      prompt: "Thành phần nào tạo giao diện?",
      position: 1,
      options: [
        { id: "option-a", label: "React", position: 1 },
        { id: "option-b", label: "PostgreSQL", position: 2 },
      ],
    },
  ],
};

describe("LearningQuizContent", () => {
  const getAccessToken = vi.fn().mockResolvedValue("access-token");

  beforeEach(() => {
    vi.clearAllMocks();
    getAccessToken.mockResolvedValue("access-token");
    fetchQuizMock.mockResolvedValue(quiz);
  });

  it("loads accessible questions and validates unanswered questions before submitting", async () => {
    const user = userEvent.setup();
    render(<LearningQuizContent lessonId="lesson-1" getAccessToken={getAccessToken} />);

    expect(
      await screen.findByRole("group", { name: /Thành phần nào tạo giao diện/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Câu 1/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Nộp bài kiểm tra" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng chọn đáp án cho câu 1.");
    expect(submitQuizMock).not.toHaveBeenCalled();
  });

  it("submits the selected option and displays the score and pass state", async () => {
    submitQuizMock.mockResolvedValueOnce({
      id: "attempt-1",
      quizId: "quiz-1",
      score: 100,
      correctAnswers: 1,
      totalQuestions: 1,
      passed: true,
      submittedAt: "2026-09-30T10:00:00Z",
    });
    const onPassed = vi.fn();
    const user = userEvent.setup();
    render(
      <LearningQuizContent
        lessonId="lesson-1"
        getAccessToken={getAccessToken}
        onPassed={onPassed}
      />,
    );

    await user.click(await screen.findByRole("radio", { name: "React" }));
    await user.click(screen.getByRole("button", { name: "Nộp bài kiểm tra" }));

    expect(submitQuizMock).toHaveBeenCalledWith("access-token", "lesson-1", [
      { questionId: "question-1", optionId: "option-a" },
    ]);
    expect(await screen.findByText("Bạn đã hoàn thành bài kiểm tra")).toBeInTheDocument();
    expect(screen.getByText(/100%/)).toBeInTheDocument();
    expect(onPassed).toHaveBeenCalledOnce();
  });

  it("offers retry when the quiz cannot be loaded", async () => {
    fetchQuizMock.mockRejectedValueOnce(new Error("Mạng không ổn định."));
    const user = userEvent.setup();
    render(<LearningQuizContent lessonId="lesson-1" getAccessToken={getAccessToken} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Mạng không ổn định.");
    await user.click(screen.getByRole("button", { name: "Thử tải lại" }));
    expect(
      await screen.findByRole("group", { name: /Thành phần nào tạo giao diện/ }),
    ).toBeInTheDocument();
  });
});
