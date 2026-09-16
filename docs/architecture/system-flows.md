# System Flows

Tài liệu này mô tả các luồng nghiệp vụ chính của EduAlto ở mức kiến trúc. Nội dung tập trung vào backend modular monolith, REST API, WebSocket khi có giá trị realtime rõ ràng, PostgreSQL làm nguồn dữ liệu chính và Redis chỉ hỗ trợ cache/realtime/rate limit.

## Nguyên tắc chung

- Frontend gọi REST API qua prefix `/api/v1`.
- Controller chỉ nhận request, validate và gọi service.
- Service xử lý use case, kiểm tra quyền, gọi repository/infrastructure khi cần.
- Không trả JPA entity trực tiếp ra API; response phải dùng DTO.
- User-facing message trong response lỗi dùng tiếng Việt; machine-readable `code` dùng tiếng Anh.
- WebSocket chỉ dùng cho messaging, notification và trạng thái realtime thực sự cần thiết.
- AI recommendation là extension tương lai, core LMS vẫn chạy bình thường khi AI tắt.

## Registration and email verification

1. Guest gửi `POST /api/v1/auth/register`.
2. `AuthController` validate `RegisterRequest`.
3. `AuthService` kiểm tra email trùng, hash password và tạo user trạng thái `PENDING_VERIFICATION`.
4. Hệ thống tạo OTP có TTL, lưu hash OTP, gửi email.
5. Guest gửi `POST /api/v1/auth/verify-email`.
6. `AuthService` xác thực OTP, đổi user sang `ACTIVE`, gán role mặc định `STUDENT`.
7. API trả message tiếng Việt xác nhận đăng ký thành công.

## Login and token refresh

1. User gửi `POST /api/v1/auth/login`.
2. Backend xác thực email/password, trạng thái tài khoản và role.
3. Backend phát hành short-lived access token và refresh token.
4. Refresh token được lưu dạng hash để có thể revoke.
5. Khi access token hết hạn, frontend gọi `POST /api/v1/auth/refresh`.
6. Nếu refresh token hợp lệ, backend rotate token và trả token mới.
7. Khi logout, frontend gọi `POST /api/v1/auth/logout`, backend revoke refresh token hiện tại.

## Course discovery

1. Guest/Student gọi `GET /api/v1/courses` với `q`, `category`, `level`, `page`, `size`, `sort`.
2. `CourseService` chỉ trả khóa học `PUBLISHED` cho public endpoint.
3. Query phải phân trang, không over-fetch section/lesson/detail nặng.
4. Response trả `CourseSummaryResponse` và `meta` phân trang.
5. Nếu không có dữ liệu, frontend hiển thị empty state tiếng Việt.

## Course enrollment

1. Student gọi `POST /api/v1/courses/{courseId}/enrollments`.
2. Security kiểm tra user đã đăng nhập và có role `STUDENT`.
3. `EnrollmentService` kiểm tra course tồn tại, đã publish, chưa ghi danh trùng.
4. Backend tạo `enrollments`, tạo progress khởi tạo khi cần.
5. `NotificationService` tạo thông báo in-app.
6. API trả `EnrollmentResponse`.

## Lesson learning progress

1. Student mở bài học qua `GET /api/v1/lessons/{lessonId}`.
2. Backend kiểm tra Student đã enroll course chứa lesson.
3. API trả lesson DTO phù hợp quyền truy cập.
4. Khi hoàn thành, Student gọi `POST /api/v1/lessons/{lessonId}/complete`.
5. `LearningService` cập nhật `learning_progress`, tính progress tổng.
6. Hệ thống phát `learning_signal` loại `LESSON_COMPLETED` để analytics/AI tương lai đọc.

## Quiz attempt

1. Student gọi `GET /api/v1/quizzes/{quizId}` để lấy câu hỏi được phép hiển thị.
2. Student gửi `POST /api/v1/quizzes/{quizId}/attempts`.
3. `QuizService` validate enrollment, attempt policy, deadline và answer format.
4. Backend chấm tự động cho câu hỏi khách quan, lưu `quiz_attempts`, `quiz_answers`.
5. Kết quả trả về `QuizAttemptResponse`, không expose đáp án đúng nếu policy chưa cho phép.
6. Analytics nhận signal `QUIZ_SUBMITTED`.

## Assignment submission and grading

1. Student gửi `POST /api/v1/assignments/{assignmentId}/submissions`.
2. Backend validate enrollment, deadline, file metadata và giới hạn dung lượng.
3. File được lưu qua storage abstraction, DB chỉ lưu metadata.
4. Instructor gọi `POST /api/v1/assignment-submissions/{submissionId}/grade`.
5. Backend kiểm tra Instructor sở hữu course hoặc có quyền admin.
6. Hệ thống lưu điểm/feedback, tạo notification cho Student.

## Discussion and comments

1. Student/Instructor gọi `POST /api/v1/courses/{courseId}/discussions`.
2. Backend kiểm tra quyền theo enrollment/ownership.
3. Nội dung được validate độ dài, trạng thái course và moderation rule cơ bản.
4. Comment dùng `POST /api/v1/discussions/{discussionId}/comments`.
5. Notification được tạo cho tác giả discussion hoặc participant liên quan.

## Messaging

1. User lấy danh sách qua `GET /api/v1/conversations`.
2. User gửi tin realtime qua STOMP `SEND /app/conversations/{conversationId}/messages`.
3. WebSocket handler kiểm tra JWT và participant membership.
4. Message được persist trước khi broadcast.
5. Người nhận subscribe `/topic/conversations/{conversationId}` hoặc `/user/queue/notifications`.

## Notification

1. Module nghiệp vụ gọi `NotificationService.create(...)`.
2. Notification được persist vào PostgreSQL.
3. Nếu người nhận đang online, backend gửi qua WebSocket user queue.
4. Frontend vẫn có thể đồng bộ lại bằng `GET /api/v1/me/notifications`.
5. Mark read dùng `POST /api/v1/me/notifications/{notificationId}/read`.

## Certificate

1. Student hoàn thành course progress theo threshold.
2. `CertificateService` kiểm tra enrollment, quiz/assignment required rule.
3. Backend tạo certificate duy nhất cho `(student_id, course_id)`.
4. Student gọi `GET /api/v1/me/certificates` hoặc endpoint chi tiết trong phase triển khai.

## AI recommendation future flow

1. Core LMS phát `learning_signals` từ enrollment, lesson, quiz, assignment.
2. `AnalyticsService` aggregate dữ liệu học tập.
3. `AI` module tương lai đọc signal theo batch/scheduled job.
4. Recommendation được lưu vào bảng riêng với `model_version`, `reason`.
5. Frontend gọi `GET /api/v1/me/recommendations`.
6. Nếu AI tắt hoặc chưa có gợi ý, frontend hiển thị `Chưa có gợi ý học tập phù hợp`.

