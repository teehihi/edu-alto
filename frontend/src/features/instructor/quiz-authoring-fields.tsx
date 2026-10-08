"use client";

import { Plus, Sparkles, Trash2 } from "lucide-react";

export type QuizDraftOption = { label: string; correct: boolean };
export type QuizDraftQuestion = { id: number; prompt: string; options: QuizDraftOption[] };

export function createQuizDraftQuestion(id: number): QuizDraftQuestion {
  return {
    id,
    prompt: "",
    options: [
      { label: "", correct: true },
      { label: "", correct: false },
      { label: "", correct: false },
      { label: "", correct: false },
    ],
  };
}

type Props = {
  questions: QuizDraftQuestion[];
  onQuestionsChange: (update: (current: QuizDraftQuestion[]) => QuizDraftQuestion[]) => void;
  onAddQuestion: () => void;
};

const optionLabels = ["A", "B", "C", "D", "E", "F"];

export function QuizAuthoringFields({ questions, onQuestionsChange, onAddQuestion }: Props) {
  return (
    <section aria-label="Câu hỏi bài kiểm tra" className="max-w-[996px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[560px]">
          <h3 className="text-base font-semibold text-primary">Câu hỏi ôn tập</h3>
          <p className="mt-1 text-[13px] leading-5 text-[#62748e]">
            Thêm câu hỏi trắc nghiệm. Chọn nút tròn để đổi đáp án đúng; dùng thùng rác để xóa phương
            án.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Tính năng tạo câu hỏi bằng AI chưa khả dụng"
            className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-medium text-slate-500 disabled:cursor-not-allowed disabled:opacity-80"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Tạo bằng AI
          </button>
          <button
            type="button"
            disabled={questions.length >= 100}
            onClick={onAddQuestion}
            className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-primary/40 bg-emerald-50 px-3 text-xs font-medium text-primary transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Thêm câu hỏi
          </button>
        </div>
      </div>

      {questions.map((question, questionIndex) => (
        <fieldset
          key={question.id}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="flex items-center justify-between">
            <legend className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#90a1b9]">
              Câu {questionIndex + 1}
            </legend>
            <button
              type="button"
              aria-label={`Xóa câu ${questionIndex + 1}`}
              disabled={questions.length <= 1}
              onClick={() =>
                onQuestionsChange((current) => current.filter((item) => item.id !== question.id))
              }
              className="focus-ring inline-flex size-8 items-center justify-center rounded-md text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <label className="sr-only" htmlFor={`quiz-prompt-${question.id}`}>
            {questionIndex === 0 ? "Nội dung câu hỏi" : `Nội dung câu hỏi ${questionIndex + 1}`}
          </label>
          <input
            id={`quiz-prompt-${question.id}`}
            type="text"
            maxLength={2000}
            value={question.prompt}
            onChange={(event) =>
              onQuestionsChange((current) =>
                current.map((item) =>
                  item.id === question.id ? { ...item, prompt: event.target.value } : item,
                ),
              )
            }
            placeholder="Nhập câu hỏi của bạn..."
            className="focus-ring h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] text-heading placeholder:text-slate-400"
          />

          <div className="space-y-2">
            {question.options.map((option, optionIndex) => (
              <div key={optionIndex} className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`quiz-correct-${question.id}`}
                  aria-label={`Đáp án đúng câu ${questionIndex + 1}, phương án ${optionLabels[optionIndex]}`}
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
                  style={{
                    backgroundImage: option.correct
                      ? "radial-gradient(circle, #20B486 0 38%, transparent 42%)"
                      : undefined,
                  }}
                  className="h-4 w-4 shrink-0 appearance-none rounded-full border-2 border-[#98a2b3] bg-white bg-center bg-no-repeat transition-colors checked:border-primary hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2"
                />
                <label className="sr-only" htmlFor={`quiz-option-${question.id}-${optionIndex}`}>
                  Phương án {optionLabels[optionIndex]} câu {questionIndex + 1}
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
                  placeholder={`Lựa chọn ${optionLabels[optionIndex]}`}
                  className={`focus-ring h-[38px] min-w-0 flex-1 rounded-lg border px-3 text-[13px] placeholder:text-slate-400 ${
                    option.correct
                      ? "border-emerald-300 bg-emerald-50/80"
                      : "border-slate-200 bg-white"
                  }`}
                />
                {option.correct ? (
                  <span className="shrink-0 text-[10px] font-semibold uppercase text-emerald-600">
                    Đáp án
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={`Xóa phương án ${optionLabels[optionIndex]} câu ${questionIndex + 1}`}
                  title={
                    question.options.length <= 2
                      ? "Mỗi câu hỏi cần ít nhất 2 phương án"
                      : `Xóa phương án ${optionLabels[optionIndex]}`
                  }
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
                  className="focus-ring inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          {question.options.length < 6 ? (
            <button
              type="button"
              onClick={() =>
                onQuestionsChange((current) =>
                  current.map((item) =>
                    item.id === question.id
                      ? { ...item, options: [...item.options, { label: "", correct: false }] }
                      : item,
                  ),
                )
              }
              className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-primary transition hover:text-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Thêm phương án
            </button>
          ) : null}
        </fieldset>
      ))}
    </section>
  );
}
