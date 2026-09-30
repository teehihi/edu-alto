"use client";

import { Trash2 } from "lucide-react";

export type QuizDraftOption = { label: string; correct: boolean };
export type QuizDraftQuestion = { id: number; prompt: string; options: QuizDraftOption[] };

export function createQuizDraftQuestion(id: number): QuizDraftQuestion {
  return {
    id,
    prompt: "",
    options: [
      { label: "", correct: true },
      { label: "", correct: false },
    ],
  };
}

type Props = {
  passingScore: string;
  questions: QuizDraftQuestion[];
  onPassingScoreChange: (value: string) => void;
  onQuestionsChange: (update: (current: QuizDraftQuestion[]) => QuizDraftQuestion[]) => void;
  onAddQuestion: () => void;
};

export function QuizAuthoringFields({
  passingScore,
  questions,
  onPassingScoreChange,
  onQuestionsChange,
  onAddQuestion,
}: Props) {
  return (
    <section
      aria-label="Câu hỏi bài kiểm tra"
      className="space-y-4 rounded-2xl border border-purple-100 bg-purple-50/40 p-4"
    >
      <div>
        <h4 className="text-sm font-bold text-heading">Câu hỏi trắc nghiệm</h4>
        <p className="mt-1 text-xs text-muted">
          Mỗi câu cần từ 2 đến 6 phương án và đúng một đáp án đúng.
        </p>
      </div>

      <div className="max-w-xs">
        <label htmlFor="quiz-passing-score" className="block text-xs font-bold text-slate-600">
          Điểm đạt (%)
        </label>
        <input
          id="quiz-passing-score"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={passingScore}
          onChange={(event) => onPassingScoreChange(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {questions.map((question, questionIndex) => (
        <fieldset
          key={question.id}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <legend className="px-1 text-xs font-bold text-heading">
            Câu hỏi {questionIndex + 1}
          </legend>
          <div>
            <label
              htmlFor={`quiz-prompt-${question.id}`}
              className="block text-xs font-semibold text-slate-600"
            >
              Nội dung câu hỏi
            </label>
            <textarea
              id={`quiz-prompt-${question.id}`}
              maxLength={2000}
              rows={2}
              value={question.prompt}
              onChange={(event) =>
                onQuestionsChange((current) =>
                  current.map((item) =>
                    item.id === question.id ? { ...item, prompt: event.target.value } : item,
                  ),
                )
              }
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Phương án · Chọn đáp án đúng</p>
            {question.options.map((option, optionIndex) => (
              <div key={optionIndex} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`quiz-correct-${question.id}`}
                  aria-label={`Đáp án đúng câu ${questionIndex + 1}, phương án ${optionIndex + 1}`}
                  checked={option.correct}
                  onChange={() =>
                    onQuestionsChange((current) =>
                      current.map((item) =>
                        item.id === question.id
                          ? {
                              ...item,
                              options: item.options.map((candidate, candidateIndex) => ({
                                ...candidate,
                                correct: candidateIndex === optionIndex,
                              })),
                            }
                          : item,
                      ),
                    )
                  }
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <label htmlFor={`quiz-option-${question.id}-${optionIndex}`} className="sr-only">
                  Phương án {optionIndex + 1} câu {questionIndex + 1}
                </label>
                <input
                  id={`quiz-option-${question.id}-${optionIndex}`}
                  type="text"
                  maxLength={500}
                  value={option.label}
                  onChange={(event) =>
                    onQuestionsChange((current) =>
                      current.map((item) =>
                        item.id === question.id
                          ? {
                              ...item,
                              options: item.options.map((candidate, candidateIndex) =>
                                candidateIndex === optionIndex
                                  ? { ...candidate, label: event.target.value }
                                  : candidate,
                              ),
                            }
                          : item,
                      ),
                    )
                  }
                  placeholder={`Nhập phương án ${optionIndex + 1}`}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  aria-label={`Xóa phương án ${optionIndex + 1} câu ${questionIndex + 1}`}
                  disabled={question.options.length <= 2}
                  onClick={() =>
                    onQuestionsChange((current) =>
                      current.map((item) => {
                        if (item.id !== question.id || item.options.length <= 2) return item;
                        const options = item.options.filter((_, index) => index !== optionIndex);
                        if (!options.some((candidate) => candidate.correct)) {
                          options[0] = { ...options[0], correct: true };
                        }
                        return { ...item, options };
                      }),
                    )
                  }
                  className="focus-ring rounded p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={question.options.length >= 6}
              onClick={() =>
                onQuestionsChange((current) =>
                  current.map((item) =>
                    item.id === question.id
                      ? { ...item, options: [...item.options, { label: "", correct: false }] }
                      : item,
                  ),
                )
              }
              className="focus-ring rounded text-xs font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Thêm phương án
            </button>
          </div>

          <button
            type="button"
            disabled={questions.length <= 1}
            onClick={() =>
              onQuestionsChange((current) => current.filter((item) => item.id !== question.id))
            }
            className="focus-ring rounded text-xs font-semibold text-rose-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
          >
            Xóa câu hỏi
          </button>
        </fieldset>
      ))}

      <button
        type="button"
        disabled={questions.length >= 100}
        onClick={onAddQuestion}
        className="focus-ring rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        + Thêm câu hỏi
      </button>
    </section>
  );
}
