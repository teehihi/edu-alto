# Module Boundaries

EduAlto dùng modular monolith trong foundation. Module là ranh giới tổ chức code, rule nghiệp vụ và ownership dữ liệu; module không phải microservice.

## Dependency rule

Dependency direction mặc định:

```text
controller -> service/application -> domain -> repository -> infrastructure
```

Cross-module dependency phải đi qua service/use case công khai của module sở hữu dữ liệu. Không import entity nội bộ của module khác để xử lý nghiệp vụ tùy tiện.

## Module map

| Module | Owns | May depend on | Must not do |
| --- | --- | --- | --- |
| `auth` | Registration, login, token, OTP, password reset | `user`, security infrastructure, email infrastructure | Không lưu password plaintext, không chứa course/learning rule. |
| `user` | Account, role assignment, status | common security, persistence | Không xử lý OTP/login flow trực tiếp. |
| `profile` | Student profile, public profile view | `user` | Không quyết định role/permission. |
| `instructor` | Instructor profile, instructor verification | `user`, `profile` | Không sở hữu course content trực tiếp. |
| `course` | Course catalog, category, publish state | `instructor`, `user` read model khi cần | Không tính learning progress. |
| `enrollment` | Student enrollment, enrollment status | `user`, `course`, `notification` | Không mutate lesson content. |
| `lesson` | Section, lesson, lesson content metadata | `course`, document/file infrastructure | Không chấm quiz/assignment. |
| `learning` | Progress, learning activity, learning signal emission | `enrollment`, `lesson`, `analytics` signal boundary | Không chứa AI recommendation logic. |
| `quiz` | Quiz, question, attempt, answer, scoring policy | `course`, `lesson`, `enrollment`, `analytics` signal boundary | Không expose correct answers ngoài policy. |
| `assignment` | Assignment, submission, grading | `course`, `lesson`, `enrollment`, file infrastructure, `notification` | Không lưu file bytes trong DB. |
| `document` | Course document, saved document, note | `course`, `lesson`, file infrastructure | Không quản lý enrollment state. |
| `discussion` | Discussion, comment, moderation state | `course`, `lesson`, `enrollment`, `notification` | Không thay thế messaging direct/group. |
| `messaging` | Conversation, participant, message | `user`, `course`, WebSocket infrastructure, `notification` | Không broadcast trước khi persist message. |
| `notification` | In-app/email notification, read state | `user`, WebSocket/email infrastructure | Không chứa business rule nguồn của event. |
| `schedule` | Calendar event, deadline/event view | `user`, `course`, `assignment` read model | Không tự tạo assignment/lesson. |
| `review` | Course review and rating | `user`, `course`, `enrollment` | Không tự cập nhật denormalized course rating nếu chưa có job rõ. |
| `certificate` | Certificate issue rule and lookup | `user`, `course`, `enrollment`, `learning`, `quiz`, `assignment` | Không sửa progress để đạt điều kiện. |
| `analytics` | Learning signals, aggregate snapshots | read-only from learning/quiz/assignment signals | Không nằm trên request path bắt buộc nếu có thể batch. |
| `admin` | Administrative use cases and governance | uses service APIs from owned modules | Không truy cập repository mọi module như shortcut mặc định. |
| `ai` | Future recommendation model metadata and recommendation output | `analytics`, `learning` read model | Không hard-code vào `CourseService` hoặc `LearningProgressService`. |

## Public boundary examples

Các interface/use case công khai có thể được bổ sung khi implement:

- `UserLookupService`: tra user id, status, role summary.
- `CourseAccessService`: kiểm tra course publish/ownership.
- `EnrollmentAccessService`: kiểm tra student đã enroll course.
- `LearningSignalPublisher`: ghi learning signal cho analytics/AI.
- `NotificationCommandService`: tạo notification từ module nguồn.
- `FileAssetService`: lưu metadata file và storage key.

Tên interface có thể thay đổi theo implementation, nhưng trách nhiệm phải giữ nguyên.

## Data ownership

| Data group | Owning module | Tables |
| --- | --- | --- |
| Identity | `auth`, `user` | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `email_otps`, `refresh_tokens` |
| Profiles | `profile`, `instructor` | `student_profiles`, `instructor_profiles` |
| Catalog | `course`, `lesson` | `categories`, `courses`, `course_categories`, `sections`, `lessons`, `lesson_contents` |
| Participation | `enrollment`, `learning` | `enrollments`, `learning_progress`, `notes` |
| Assessment | `quiz`, `assignment` | `quizzes`, `questions`, `question_options`, `quiz_attempts`, `quiz_answers`, `assignments`, `assignment_submissions` |
| Collaboration | `document`, `discussion`, `messaging` | `documents`, `saved_documents`, `discussions`, `discussion_comments`, `conversations`, `conversation_participants`, `messages` |
| Engagement | `notification`, `schedule`, `review`, `certificate` | `notifications`, `calendar_events`, `reviews`, `certificates` |
| Insight | `analytics`, `ai` | `learning_signals`, `analytics_snapshots`, `ai_model_versions`, `recommendations`, `recommendation_items`, `recommendation_reasons` |

## Allowed cross-module flows

- `auth -> user`: tạo user, đọc user status, gán role mặc định sau verify.
- `enrollment -> course`: kiểm tra course tồn tại và `PUBLISHED`.
- `lesson -> course`: đảm bảo section/lesson thuộc course hợp lệ.
- `learning -> enrollment + lesson`: xác thực enrollment trước khi cập nhật progress.
- `quiz/assignment -> enrollment`: xác thực quyền học trước khi nộp bài.
- `discussion/document -> enrollment/course`: kiểm tra quyền truy cập content.
- `messaging -> user/course`: kiểm tra participant và course conversation scope.
- `certificate -> learning/quiz/assignment`: đọc điều kiện hoàn thành, không tự sửa dữ liệu nguồn.
- `analytics -> signals`: đọc hoặc nhận append-only signal.
- `ai -> analytics`: đọc dữ liệu đã tổng hợp để sinh recommendation.

## Forbidden shortcuts

- Controller gọi repository trực tiếp cho use case nghiệp vụ.
- Trả JPA entity trực tiếp qua API.
- Tạo `GenericBaseService` hoặc `GenericBaseController` khi chưa có nhu cầu thật.
- Module `course` gọi thẳng AI provider.
- Module `learning` nhúng rule recommendation.
- WebSocket handler ghi message mà bỏ qua service/authorization.
- Admin module truy cập repository của mọi module thay vì dùng service boundary.

## Package guidance

Backend package nên giữ cấu trúc dễ kiểm soát:

```text
com.edualto.<module>.controller
com.edualto.<module>.service
com.edualto.<module>.domain
com.edualto.<module>.repository
com.edualto.<module>.dto
com.edualto.<module>.infrastructure
```

Không phải module nào cũng cần đủ mọi package ngay từ đầu. Chỉ tạo package khi có trách nhiệm thật.

## Review checklist

- Module sở hữu dữ liệu nào?
- Use case có đi qua service/application layer không?
- DTO có tách khỏi entity không?
- Cross-module dependency có qua boundary công khai không?
- Có business rule nào bị đặt trong controller/repository không?
- Có AI/realtime/cache logic nào bị nhét vào core service sai chỗ không?
