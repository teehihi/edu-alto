import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LearningQuizContent } from "./learning-quiz-content";

const { fetchQuizMock, startQuizMock, submitQuizMock } = vi.hoisted(() => ({
  fetchQuizMock: vi.fn(),
  startQuizMock: vi.fn(),
  submitQuizMock: vi.fn(),
}));

vi.mock("@/lib/learning-client", () => ({
  fetchLearningQuiz: fetchQuizMock,
  startLearningQuiz: startQuizMock,
  submitLearningQuiz: submitQuizMock,
}));

const quiz = {
  id: "quiz-1",
  lessonId: "lesson-1",
  lessonTitle: "Kiểm tra cơ bản",
  passingScore: 70,
  questionCount: 1,
  questionsPerAttempt: 0,
  durationMinutes: 0,
  questions: [],
};

const session = {
  id: "session-1",
  quizId: "quiz-1",
  startedAt: "2026-10-12T10:00:00Z",
  expiresAt: null,
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
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    submitQuizMock.mockReset();
    window.localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("scrollTo", vi.fn());
    getAccessToken.mockResolvedValue("access-token");
    fetchQuizMock.mockResolvedValue(quiz);
    startQuizMock.mockResolvedValue(session);
  });

  it("starts the quiz and confirms a submission with unanswered questions", async () => {
    submitQuizMock.mockResolvedValueOnce({
      id: "attempt-1",
      quizId: "quiz-1",
      score: 0,
      correctAnswers: 0,
      totalQuestions: 1,
      passed: false,
      submittedAt: "2026-09-30T10:00:00Z",
      activityEventCount: 0,
      review: [],
    });
    const user = userEvent.setup();
    render(<LearningQuizContent lessonId="lesson-1" getAccessToken={getAccessToken} />);

    await user.click(await screen.findByRole("button", { name: "Bắt đầu làm bài" }));
    expect(await screen.findByRole("group", { name: /Câu 1/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Nộp bài kiểm tra" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("Còn 1 câu chưa trả lời");
    await user.click(screen.getByRole("button", { name: "Vẫn nộp" }));
    expect(submitQuizMock).toHaveBeenCalledWith("access-token", "lesson-1", "session-1", [], []);
    expect(await screen.findByText("Chưa đạt điểm yêu cầu")).toBeInTheDocument();
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
      activityEventCount: 0,
      review: [],
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

    await user.click(await screen.findByRole("button", { name: "Bắt đầu làm bài" }));
    await user.click(await screen.findByRole("radio", { name: "React" }));
    await user.click(screen.getByRole("button", { name: "Nộp bài kiểm tra" }));

    expect(submitQuizMock).toHaveBeenCalledWith(
      "access-token",
      "lesson-1",
      "session-1",
      [{ questionId: "question-1", optionId: "option-a" }],
      [],
    );
    expect(await screen.findByText("Đạt yêu cầu")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    });
    expect(onPassed).toHaveBeenCalledOnce();
  });

  it("offers retry when the quiz cannot be loaded", async () => {
    fetchQuizMock.mockRejectedValueOnce(new Error("Mạng không ổn định."));
    const user = userEvent.setup();
    render(<LearningQuizContent lessonId="lesson-1" getAccessToken={getAccessToken} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Mạng không ổn định.");
    await user.click(screen.getByRole("button", { name: "Thử tải lại" }));
    expect(await screen.findByRole("button", { name: "Bắt đầu làm bài" })).toBeInTheDocument();
  });
});
