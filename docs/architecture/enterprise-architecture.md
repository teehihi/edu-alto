# Enterprise Architecture

Tài liệu này mô tả kiến trúc doanh nghiệp của EduAlto theo hướng **EA-inspired**. Mục tiêu là tạo một góc nhìn thống nhất giữa năng lực nghiệp vụ, ứng dụng, dữ liệu, công nghệ và triển khai cho foundation LMS.

Tài liệu này **không claim TOGAF compliance** và **không claim ArchiMate compliance**. Mermaid vẫn được dùng cho flow, overview, ERD và sequence; các sơ đồ UML nghiệp vụ như use case hoặc deployment có source UML/EA-style riêng để đúng chuẩn phân tích thiết kế hơn.

## Architecture intent

EduAlto là nền tảng học tập trực tuyến cho người dùng Việt Nam. Foundation ưu tiên:

- LMS core chạy ổn định trước khi mở rộng AI.
- Modular monolith thay vì microservices.
- REST API nhất quán cho request/response workflow.
- WebSocket/STOMP chỉ dùng cho messaging và notification realtime.
- PostgreSQL là nguồn dữ liệu chính.
- Redis hỗ trợ cache, session-like coordination hoặc realtime event distribution khi cần.
- AI là extension tương lai, có thể tắt mà không phá vỡ core LMS.

## Enterprise architecture views

Nguồn diagram nằm trong `docs/architecture/diagrams/ea/`:

- `01-ea-business-architecture.mmd`: capability và actor nghiệp vụ.
- `02-ea-application-architecture.mmd`: application components và module groups.
- `03-ea-data-architecture.mmd`: data domains, ownership và data stores.
- `04-ea-technology-architecture.mmd`: technology stack foundation.
- `05-ea-layered-architecture.mmd`: layer từ user experience đến infrastructure.
- `06-ea-application-data-mapping.mmd`: mapping application module với data domain.
- `07-ea-deployment-view.puml`: deployment view UML/EA-style cho môi trường foundation.

## Business architecture view

Business architecture tập trung vào các actor chính và năng lực EduAlto cần hỗ trợ:

- Guest khám phá khóa học, đăng ký và đăng nhập.
- Student ghi danh, học bài, làm quiz/bài tập, lưu tài liệu, thảo luận, nhắn tin, nhận thông báo, xem tiến độ và chứng chỉ.
- Instructor quản lý khóa học, lesson, quiz, assignment, tài liệu, feedback và thảo luận.
- Administrator quản lý user, role, category, nội dung, báo cáo và cấu hình.

Các capability được nhóm thành bốn boundary:

- Acquisition & Access: khám phá, đăng ký, xác thực.
- Learning Delivery: khóa học, lesson, enrollment, progress, assessment.
- Collaboration & Engagement: discussion, messaging, notification, schedule, review.
- Governance & Insight: admin, analytics, certificate, AI recommendation tương lai.

## Application architecture view

Application architecture giữ ranh giới rõ giữa frontend, backend và support services:

- Next.js frontend chịu trách nhiệm UI tiếng Việt, routing, form state, validation state và gọi API.
- Spring Boot backend là modular monolith, chia module theo domain LMS.
- Spring Security xử lý authentication/authorization.
- REST API là giao diện chính giữa frontend và backend.
- WebSocket/STOMP phục vụ realtime messaging và notification.
- OpenAPI phản ánh endpoint thật.

Backend dependency direction vẫn là:

```text
controller -> service/application -> domain -> repository -> infrastructure
```

Controller không chứa business logic. Service xử lý use case. Domain giữ rule cốt lõi. Repository chỉ truy cập persistence. DTO không lẫn entity.

## Data architecture view

PostgreSQL là system of record cho dữ liệu nghiệp vụ. Redis không thay thế PostgreSQL; Redis chỉ hỗ trợ cache/realtime coordination khi có use case rõ.

Data domain chính:

- Identity: user, role, permission, OTP, auth token metadata.
- Learning catalog: category, course, section, lesson, content metadata.
- Participation: enrollment, learning progress, saved document, note.
- Assessment: quiz, question, attempt, assignment, submission, grading.
- Collaboration: discussion, comment, conversation, message.
- Engagement: notification, schedule, review, certificate.
- Insight: analytics signal, learning signal, AI recommendation metadata tương lai.

Quy ước dữ liệu:

- PostgreSQL table/column dùng tiếng Anh và snake_case.
- Primary key mặc định UUID.
- Entity quan trọng có `created_at`, `updated_at`.
- Enum lưu string ổn định.
- Dùng FK, unique constraint và index rõ ràng.

## Technology architecture view

Foundation technology stack:

- Frontend: Next.js, React, TypeScript, Tailwind CSS.
- Backend: Java 25 LTS, Spring Boot, Spring Security, Spring Data JPA.
- API: REST, OpenAPI, WebSocket/STOMP.
- Database: PostgreSQL.
- Cache/realtime support: Redis.
- Testing: Vitest/Testing Library, JUnit 5/Spring Boot Test.
- Runtime/development: Docker Compose cho local foundation khi cần.

Production hardening cần được review riêng trước khi bật public deployment: CORS theo environment, JWT/refresh token rotation, rate limiting, upload scanning, observability, backup/restore và secret management.

## Layered architecture view

Layering giúp kiểm soát dependency và trách nhiệm:

- Experience layer: web UI tiếng Việt, responsive, accessible.
- API layer: REST controller, WebSocket endpoint, request validation, response/error format.
- Application layer: use case orchestration.
- Domain layer: domain model, rule, state transition.
- Persistence layer: repository, JPA mapping, query.
- Infrastructure layer: PostgreSQL, Redis, email provider, file storage tương lai, AI provider tương lai.

Không tạo `GenericBaseService` hoặc `GenericBaseController` nếu chưa có nhu cầu thật. Không đưa AI logic vào `CourseService` hoặc `LearningProgressService`.

## Application-data mapping view

Mỗi module sở hữu hoặc thao tác trên một nhóm dữ liệu rõ ràng. Cross-module access nên đi qua service/use case đã định nghĩa thay vì truy cập tùy tiện vào entity nội bộ của module khác.

Các module có dependency hợp lý:

- `auth` phụ thuộc vào `user` cho identity.
- `profile` và `instructor` mở rộng dữ liệu người dùng.
- `enrollment`, `lesson`, `quiz`, `assignment`, `document`, `review`, `certificate` phụ thuộc vào `course` ở mức use case.
- `learning` nhận tín hiệu từ lesson/assessment để cập nhật progress.
- `analytics` đọc signal từ learning/quiz/assignment.
- `ai` đọc analytics/learning signals trong tương lai và trả recommendation qua boundary riêng.

## Deployment view

Foundation deployment view gồm:

- Browser truy cập Next.js web app.
- Next.js gọi Spring Boot API qua `/api/v1`.
- Browser mở WebSocket tới backend khi dùng messaging/notification realtime.
- Spring Boot kết nối PostgreSQL và Redis.
- Backend tích hợp email provider cho OTP và notification email khi cần.
- AI provider/service là optional future integration.

Trong foundation, deployment nên giữ đơn giản để phục vụ phát triển, test và demo. Microservices, message broker phức tạp hoặc AI production API không thuộc phạm vi mặc định.

## Governance notes

- Mọi UI copy, validation message, empty state và notification cho user phải dùng tiếng Việt.
- API path, source code, database naming dùng tiếng Anh.
- Các thay đổi thêm module mới phải cập nhật tài liệu kiến trúc trước.
- Critical/High review findings phải sửa trước khi approve.
- Không merge code làm vỡ lint, typecheck, build hoặc test.

## Diagram maintenance

Khi module, data domain hoặc deployment boundary thay đổi, cập nhật source diagram tương ứng trước hoặc cùng lúc với thay đổi code. Dùng [diagram-standards.md](./diagram-standards.md) để chọn đúng loại source:

- UML/EA-style diagrams dùng `.puml` làm source chính và render ra `.svg`.
- Mermaid diagrams dùng `.mmd` làm source chính và render ra `.svg`.
- Không giữ `.mmd` mirror nếu diagram đã có source UML `.puml`.
- Sequence và ERD hiện tại có thể tiếp tục dùng Mermaid nếu vẫn rõ lifeline/entity relationship.
