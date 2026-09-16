# Testing Strategy

EduAlto dùng testing để bảo vệ kiến trúc modular monolith, API contract và UI tiếng Việt. Foundation không cần test mọi tính năng giả định, nhưng mọi module triển khai thật phải có test cho behavior quan trọng.

## Test pyramid

- Unit test: domain rule, mapper, helper, validation nhỏ.
- Service test: use case chính, phân quyền, trạng thái nghiệp vụ.
- Controller test: request/response, validation, status code, error format.
- Integration test: repository, database constraint, Redis/WebSocket khi cần.
- Frontend component test: form state, loading, empty, error, disabled, accessibility label.
- E2E smoke test: flow đăng ký/login/course discovery khi app đủ sẵn sàng.

## Backend

Stack:

- JUnit 5.
- Spring Boot Test.
- MockMvc hoặc WebTestClient cho controller.
- Testcontainers cho PostgreSQL/Redis ở integration profile khi cần.

Ưu tiên test:

- Auth: register, verify email, login, refresh, logout, forgot/reset password.
- Authorization: ownership/enrollment/instructor ownership/admin permission.
- Course: public listing, draft không public, publish rule.
- Enrollment: duplicate enrollment, course chưa publish.
- Learning: mark complete chỉ khi enrolled.
- Quiz/assignment: deadline, attempt/submission status, grading permission.
- Error mapping: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`.

## Frontend

Stack:

- Vitest.
- Testing Library.
- Mock API ở boundary `src/lib` hoặc service layer.

Ưu tiên test:

- Form có label, validation message tiếng Việt và disabled/loading state.
- Empty state tiếng Việt khi không có course/recommendation/notification.
- Error state không hiển thị lỗi kỹ thuật như `AxiosError`.
- Course card, course filters, auth forms, dashboard summary.
- Responsive behavior quan trọng có thể kiểm bằng class/state ở component test, visual QA thủ công theo phase.

## API contract

- OpenAPI phải khớp endpoint thật.
- Response success/error thống nhất.
- Pagination dùng `page`, `size`, `sort`.
- Controller test phải assert `Content-Type`, status code và body shape.
- Không đổi field public mà không cập nhật docs và migration note.

## Security tests

- Missing token trả `401`.
- Token hợp lệ nhưng thiếu quyền trả `403`.
- User không thể đọc/sửa resource của người khác.
- Password/OTP/token không xuất hiện trong log/test snapshot.
- WebSocket subscribe/send bị từ chối nếu không phải participant.

## Data tests

- Repository integration test cho unique constraint quan trọng: `users.email`, `courses.slug`, `(student_id, course_id)`.
- Enum lưu string, không phụ thuộc ordinal.
- Migration test chạy schema từ đầu trong CI khi có Flyway/Liquibase.

## CI quality gates

Không merge nếu các lệnh tương ứng fail:

```text
npm run lint
npm run test
npm run build
./mvnw test
```

Tên lệnh thực tế sẽ theo package/backend setup của phase triển khai. Nếu chưa có lệnh, task khởi tạo phải thêm script rõ ràng.

