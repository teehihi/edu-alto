# EduAlto Agent Guide

Tất cả agent phải đọc file này trước khi code.

## Project overview

EduAlto là nền tảng học tập trực tuyến dành cho người dùng Việt Nam. UI, UX copy, thông báo lỗi, empty state, loading text, tooltip, course demo content và validation message phải dùng tiếng Việt. Source code, file name, class name, function name, API path, database table/column name phải dùng tiếng Anh.

## Tech stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS.
- Backend: Java 25 LTS, Spring Boot, REST API, OpenAPI, Spring Security, WebSocket.
- Database: PostgreSQL.
- Cache/realtime support: Redis.
- Testing: Vitest/Testing Library, JUnit 5/Spring Boot Test.

## Architecture

EduAlto dùng modular monolith, không dùng microservices trong foundation.

Backend dependency direction:

```text
controller -> service/application -> domain -> repository -> infrastructure
```

Không để controller chứa business logic. Không trả JPA entity trực tiếp ra API khi cần DTO. Không tạo `GenericBaseService`, `GenericBaseController` hoặc abstraction chung nếu chưa có nhu cầu thật.

## Module boundaries

Module chính:

- auth
- user
- profile
- instructor
- course
- enrollment
- lesson
- learning
- quiz
- assignment
- document
- discussion
- messaging
- notification
- schedule
- review
- certificate
- analytics
- admin
- ai

Nếu cần module mới, cập nhật tài liệu kiến trúc trước.

## Naming conventions

- Source code: English.
- API: English, RESTful, `/api/v1/...`.
- Database: English, snake_case.
- UI copy: Vietnamese.
- React component: PascalCase.
- Java class: PascalCase.
- Java package: lowercase.
- DTO suffix: `Request`, `Response`, `Dto`.
- Test suffix: `Test`.

## UI and Figma rules

Figma là source of truth cho visual design, không phải toàn bộ behavior. Developer phải tự thiết kế interaction hợp lý cho hover, active, focus, disabled, loading, success, error, empty, skeleton, tooltip, modal, dropdown, sidebar, toast và responsive behavior.

Design tokens foundation:

- Primary: `#20B486`
- Heading: `#101A2C`
- Muted: `#667085`
- Footer: `#F5FBF9`
- Footer secondary: `#EAF7F3`
- Footer divider: `#DDEFE9`
- Feature colors: `#F5C34D`, `#F4866D`, `#C77A9A`
- Radius mặc định: 8px cho button/card; 12px chỉ khi Figma dùng card feature lớn.

Không biến EduAlto thành website AI/neon/futuristic. AI là extension tương lai, sản phẩm chính là LMS.

## Frontend rules

- Component reusable đặt trong `src/components`.
- Feature-specific composition đặt trong `src/features`.
- API client và helpers đặt trong `src/lib`.
- Type dùng trong nhiều module đặt trong `src/types`.
- Không hard-code API URL rải rác; dùng config/env helper.
- Mọi form phải có label, validation state và message tiếng Việt.
- Mọi button/action quan trọng phải có hover, active, focus-visible, disabled và loading style.
- Responsive phải có layout riêng cho mobile/tablet khi cần, không chỉ scale desktop.

## Backend rules

- Controller nhận request, validate và gọi service.
- Service xử lý use case.
- Domain giữ entity/value object/rule cốt lõi.
- Repository chỉ truy cập persistence.
- DTO không lẫn entity.
- Exception dùng global handler, không expose stack trace cho frontend.
- Password không bao giờ lưu plaintext.
- CORS, JWT, rate limiting và file upload security phải được cân nhắc trước khi bật production.

## Database rules

- PostgreSQL.
- Table/column dùng snake_case.
- Primary key mặc định UUID.
- Entity quan trọng có `created_at`, `updated_at`.
- Dùng FK, unique constraint và index rõ ràng.
- Soft delete chỉ dùng cho dữ liệu cần audit hoặc restore.
- Enum lưu dạng string ổn định, không lưu ordinal.

## API rules

- Prefix `/api/v1`.
- Response format nhất quán.
- Error format nhất quán.
- Pagination dùng `page`, `size`, `sort`.
- Search/filter không over-fetch.
- OpenAPI phải phản ánh endpoint thật.

## Testing rules

- Frontend: component test cho UI state quan trọng.
- Backend: service test cho business rule, controller test cho request/validation/error mapping.
- Không merge code làm vỡ lint/typecheck/build/test.

## Git rules

- Kiểm tra status trước/sau.
- Không commit `.env`, secrets, build artifacts, `node_modules`, `target`, IDE junk.
- Commit message rõ ràng, ví dụ `chore: initialize EduAlto project foundation`.
- Chỉ push khi xác thực GitHub thực sự thành công.

## Agent workflow

Senior agent quyết định kiến trúc, domain boundaries, database, security, API, WebSocket và AI extension. Implementation agents chỉ làm task nhỏ đã có scope rõ ràng như component đơn giản, DTO, mapper, repository, service cơ bản, test hoặc documentation formatting.

Nếu gặp mơ hồ kiến trúc, không tự phát minh pattern mới. Báo lại senior agent hoặc cập nhật tài liệu trước khi implement.

## Review workflow

Findings phải phân loại Critical, High, Medium hoặc Low. Critical/High phải sửa trước khi approve. Sau khi sửa, review lại.

## Do not

- Không đổi UI sang tiếng Anh.
- Không bắt đầu bằng microservices.
- Không nhồi WebSocket vào mọi request/response thông thường.
- Không hard-code AI logic vào CourseService hoặc LearningProgressService.
- Không tạo abstraction vô nghĩa.
- Không copy nguyên design từ thư viện ngoài làm mất consistency.
- Không expose lỗi kỹ thuật như `AxiosError: 500` cho end user.
