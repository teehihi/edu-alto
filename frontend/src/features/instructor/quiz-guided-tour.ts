import type { TourStep } from "@/components/ui/guided-tour";

export const QUIZ_TOUR_STORAGE_KEY = "edualto_quiz_guided_tour_seen";

export const QUIZ_GUIDED_TOUR_STEPS: TourStep[] = [
  {
    id: "quiz-step-prompt",
    title: "Soạn câu hỏi",
    description:
      "Nhập nội dung câu hỏi trắc nghiệm vào ô này để bắt đầu. Hãy diễn đạt câu hỏi rõ ràng, mạch lạc để học viên dễ nắm bắt.",
    targetSelector: '[data-tour="quiz-question-prompt"]',
    fallbackSelector: '[data-tour="quiz-add-question-btn"]',
    placement: "bottom",
    spotlightPadding: 6,
    spotlightRadius: 8,
    interactiveTip: "Bạn có thể gõ thử nội dung câu hỏi trực tiếp vào ô này.",
  },
  {
    id: "quiz-step-options",
    title: "Nhập các phương án",
    description:
      "Điền nội dung các lựa chọn trả lời vào từng ô tương ứng. Dùng nút **Thêm phương án** nếu cần bổ sung nhiều lựa chọn hơn.",
    targetSelector: '[data-tour="quiz-options-area"]',
    fallbackSelector: '[data-tour="quiz-question-prompt"]',
    placement: "bottom",
    spotlightPadding: 8,
    spotlightRadius: 8,
    interactiveTip: "Bạn có thể chỉnh sửa nội dung hoặc bấm **'Thêm phương án'**.",
  },
  {
    id: "quiz-step-correct",
    title: "Chọn đáp án đúng",
    description:
      "Bấm vào nút tròn trước phương án để chỉ định đáp án chính xác. Phương án được chọn sẽ có viền xanh và nhãn **ĐÁP ÁN** nổi bật.",
    targetSelector: '[data-tour="quiz-correct-answer"]',
    fallbackSelector: '[data-tour="quiz-options-area"]',
    placement: "top",
    spotlightPadding: 6,
    spotlightRadius: 6,
    interactiveTip: "Nhấp vào nút tròn để thay đổi đáp án đúng trước khi lưu.",
  },
  {
    id: "quiz-step-settings",
    title: "Thiết lập và lưu bài học",
    description:
      "Cấu hình **điểm đạt (%)**, **thời gian làm bài**, sau đó nhấn nút **Lưu và xuất bản** ở góc trên để hoàn tất bài kiểm tra.",
    targetSelector: '[data-tour="quiz-settings"]',
    fallbackSelector: '[data-tour="quiz-save-button"]',
    placement: "bottom",
    spotlightPadding: 8,
    spotlightRadius: 8,
    interactiveTip: "Tùy chỉnh điểm đạt và thời gian theo yêu cầu của bài kiểm tra.",
  },
];
