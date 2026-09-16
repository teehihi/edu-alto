# ADR-008: AI Extension

## Status

Accepted

## Context

EduAlto có định hướng phân tích kỹ năng và gợi ý học tập bằng AI, nhưng sản phẩm chính là LMS. Nếu nhúng AI trực tiếp vào `CourseService` hoặc `LearningProgressService`, core LMS sẽ khó bảo trì và khó tắt AI khi lỗi.

## Decision

AI là extension tách boundary. Core LMS phát `learning_signals`; `analytics` và `ai` module đọc signal để tạo recommendation. Course/lesson/learning/quiz/assignment service không phụ thuộc trực tiếp vào AI service.

## Consequences

- Core LMS hoạt động bình thường khi AI tắt.
- Recommendation có thể audit bằng `model_version` và `recommendation_reasons`.
- Cần chính sách privacy/opt-out trước production nếu AI user-facing.

