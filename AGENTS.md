# EduAlto

EduAlto là nền tảng học tập trực tuyến (LMS) dành cho người dùng Việt Nam, cung cấp hệ thống học tập toàn diện cho học viên, công cụ giảng dạy và quản lý nội dung cho giảng viên, cùng hệ thống quản trị chuyên sâu. Nền tảng hỗ trợ quản lý khóa học, bài học đa phương tiện (video, tài liệu, presigned upload Cloudflare R2), theo dõi tiến độ học tập, kiểm tra đánh giá (quiz, assignment) và tương tác học tập trực tuyến.

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

## Conventions

### Language conventions

- UI, UX copy, thông báo lỗi, empty state, loading text, tooltip, course demo content và validation message phải dùng tiếng Việt.
- Source code, file name, class name, function name, API path, database table/column name, commit message và technical comments phải dùng tiếng Anh.

### Naming conventions

- Source code: English.
- API: English, RESTful, `/api/v1/...`.
- Database: English, snake_case.
- React component: PascalCase.
- Java class: PascalCase.
- Java package: lowercase.
- DTO suffix: `Request`, `Response`, `Dto`.
- Test suffix: `Test`.

### Code & Import conventions

- Tuyệt đối không dùng wildcard import (`.*`) trong bất kỳ file nào.
- Toàn bộ import phải khai báo tường minh ở phần đầu file, bên ngoài thân class. Không dùng inline fully qualified names (FQN) trong mã nguồn.

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

## Development workflow & Tooling

### Package manager & Execution

- **Bắt buộc dùng `pnpm`**: Toàn bộ thao tác cài đặt thư viện và chạy scripts frontend/monorepo phải dùng `pnpm` (`pnpm install`, `pnpm --dir frontend ...`, `pnpm <script>`). Tuyệt đối không dùng `npm` hoặc `yarn`.
- **Backend Maven Wrapper**: Luôn dùng `./backend/mvnw` (hoặc root script `pnpm backend:...`), không phụ thuộc vào Maven cài đặt toàn cục trên máy.
- **Đồng bộ dependencies sau khi Git pull/fetch**: Khi `git pull`, `git fetch`, checkout chuyển nhánh hoặc clone mới repository, bắt buộc phải chạy `pnpm install` trước khi bắt đầu viết code để đảm bảo `node_modules` và lockfile đồng bộ hoàn toàn.

### Verification workflow (Trước khi có ý định commit)

Sau khi chỉnh sửa mã nguồn, trước khi có ý định commit code, bắt buộc phải chạy đầy đủ bộ kiểm tra sau và đảm bảo 100% vượt qua:

1. **Kiểm tra lint siêu tốc**: `pnpm frontend:lint:fast` (Oxlint. Bắt buộc 0 error, 0 warning).
2. **Kiểm tra định dạng code**: `pnpm frontend:fmt:check` (dùng `pnpm frontend:fmt` để tự động sửa bằng Oxfmt).
3. **Kiểm tra kiểu dữ liệu TypeScript**: `pnpm frontend:typecheck` (`tsc --noEmit`).
4. **Chạy Unit & Component tests frontend**: `pnpm --dir frontend test` (Vitest).
5. **Chạy Integration tests backend**: `./backend/mvnw test` (hoặc `pnpm backend:test`. Chạy Testcontainers PostgreSQL 16 cô lập).

Tuyệt đối không commit hay merge code nếu bất kỳ bước kiểm tra nào bị thất bại.

### Git & Commit conventions

- **Chuẩn commit**: Tuân thủ định dạng Conventional Commits: `<type>(<scope>): <mô tả ngắn gọn bằng tiếng Anh>`.
  - Các type thông dụng: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`.
  - Ví dụ: `feat(auth): support httponly cookie for refresh token`, `fix(profile): validate bio length`, `chore(deps): bump next to 16.3.1`, `refactor(course): clean explicit imports`.
- **Atomic commit**: Mỗi commit giải quyết một mục đích cụ thể, tách biệt giữa logic tính năng, sửa lỗi và format code.
- **Bảo mật & Vệ sinh repository**: Tuyệt đối không commit file `.env`, file cấu hình chứa secrets/credentials, artifacts build (`target/`, `.next/`, `dist/`), thư mục `node_modules/` hay cấu hình IDE cá nhân (`.idea/`, `.vscode/`, `.DS_Store`).
- **Quy tắc cho Agent**: Agent chỉ thực hiện commit khi người dùng đưa ra chỉ thị hoặc xác nhận đồng ý rõ ràng. Mọi thay đổi phải được giữ ở trạng thái unstaged để người dùng chủ động review trước.

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
