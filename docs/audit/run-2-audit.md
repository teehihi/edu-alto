# EduAlto RUN #2 Audit

Ngày audit: 2026-09-16  
Vai trò: Audit Reviewer RUN #2  
Phạm vi chỉnh sửa: chỉ tạo/cập nhật `docs/audit/run-2-audit.md` và `docs/audit/figma-gap-report.md`.

## Phạm vi và nguồn evidence

- Đã đọc `AGENTS.md`.
- Đã inspect tài liệu: `docs/architecture/architecture.md`, `docs/api/api-design.md`, `docs/database/database-design.md`, `docs/architecture/coding-standards.md`, `docs/ui/figma-analysis.md`.
- Đã inspect mã hiện tại ở `backend/src/main/java`, `backend/src/test/java`, `frontend/src`, `frontend/package.json`, `backend/pom.xml`, `.gitignore`.
- Không inspect trực tiếp Figma trong lượt audit này. Figma evidence dựa trên `docs/ui/figma-analysis.md` và UI hiện tại trong repo.
- Không tìm thấy file brief RUN #2 riêng trong repository qua tìm kiếm `RUN #2`, `Run #2`, `run-2`, `A-V`, `brief`. Vì vậy checklist A-V bên dưới được audit theo yêu cầu người dùng, AGENTS.md và foundation hiện tại.

## Executive summary

RUN #2 đã có nền tảng tốt cho documentation, frontend landing page, token màu chính, Spring Boot foundation, response wrapper, global validation handler và test cơ bản. Tuy nhiên repo hiện tại vẫn là foundation/demo, chưa đạt mức "feature foundation hoàn chỉnh" nếu RUN #2 yêu cầu backend thật cho auth/course/database/security.

Các rủi ro chính cần xử lý trước khi approve RUN #2:

- Auth register chỉ trả stub, không lưu user, không kiểm tra `confirmPassword`, không OTP thật.
- Course API trả dữ liệu hard-code, chưa có repository/database/pagination/filter.
- Cấu hình datasource mặc định dùng H2 dù tài liệu và AGENTS.md yêu cầu PostgreSQL.
- WebSocket endpoint `/ws/**` đang `permitAll` trong security, chưa có xác thực participant/token.
- Thiếu migration `V1__initial_schema.sql` và entity/repository cho schema đã thiết kế.

## Findings

### CRITICAL-01: Auth register chỉ là stub, chưa thực hiện use case đăng ký an toàn

- Problem: `POST /api/v1/auth/register` chỉ trả message "OTP email sẽ được triển khai ở phase xác thực", không tạo user, không hash password, không kiểm tra `confirmPassword`, không gửi/lưu OTP.
- Evidence: `backend/src/main/java/com/edualto/auth/controller/AuthController.java` xử lý trực tiếp trong controller và trả `ApiResponse.ok(Map.of(...))`; không có `AuthService`, entity `User`, repository, OTP model hoặc persistence.
- Impact: Luồng auth trong `docs/architecture/architecture.md` và `docs/api/api-design.md` chưa được thực thi. Người dùng có thể nhận phản hồi thành công giả, không có tài khoản thật, không thể verify/login. Đây cũng vi phạm rule "Controller nhận request, validate và gọi service".
- Recommendation: Tạo `AuthService`, domain/user persistence tối thiểu, validate password confirmation, hash password bằng `PasswordEncoder`, lưu pending user/OTP hoặc trạng thái xác thực theo thiết kế, và trả status phù hợp (`201 Created` hoặc response pending nhất quán).
- Priority: CRITICAL.
- Must fix in RUN #2: Có, nếu RUN #2 bao gồm foundation auth hoặc endpoint register.

### CRITICAL-02: Course API dùng dữ liệu hard-code, chưa có persistence/query thật

- Problem: `GET /api/v1/courses` trả danh sách hard-code từ service, không dùng PostgreSQL/JPA, không hỗ trợ filter/pagination/sort như API design.
- Evidence: `backend/src/main/java/com/edualto/course/service/CourseCatalogService.java` trả `List.of(...)`; `backend/src/main/java/com/edualto/course/controller/CourseController.java` không nhận `page`, `size`, `sort`, `q`, `category`, `level`; test chỉ assert demo data có 2 item.
- Impact: Frontend/backend có thể demo được nhưng không đáp ứng contract tài liệu. Khi nối database thật sẽ phải thay đổi API behavior và test, dễ tạo regression.
- Recommendation: Implement entity/repository/query DTO tối thiểu cho course catalog, dùng `ApiResponse.page`, nhận query params theo `docs/api/api-design.md`, và test pagination/filter cơ bản.
- Priority: CRITICAL.
- Must fix in RUN #2: Có, nếu RUN #2 cần course catalog foundation thật.

### HIGH-01: Datasource mặc định dùng H2 thay vì PostgreSQL

- Problem: `application.yml` mặc định `SPRING_DATASOURCE_URL` là `jdbc:h2:mem:edualto`, trong khi AGENTS.md và database design xác định PostgreSQL là database chính.
- Evidence: `backend/src/main/resources/application.yml` có `jdbc:h2:mem:edualto;MODE=PostgreSQL...`; `backend/pom.xml` cũng đưa H2 runtime.
- Impact: Foundation có nguy cơ chạy/test lệch PostgreSQL thật, đặc biệt với UUID, JSONB, constraints, migration và enum strategy.
- Recommendation: Tách profile `test` cho H2 nếu cần, để default/dev/prod dùng PostgreSQL env rõ ràng; thêm tài liệu setup local PostgreSQL hoặc docker compose nếu thuộc scope RUN #2.
- Priority: HIGH.
- Must fix in RUN #2: Có, nếu RUN #2 yêu cầu backend/database foundation đúng chuẩn.

### HIGH-02: WebSocket được mở public nhưng chưa có xác thực/kênh bảo vệ

- Problem: Security cho phép `/ws/**` public, trong khi architecture mô tả messaging/notification realtime cần validate participant.
- Evidence: `backend/src/main/java/com/edualto/common/security/SecurityConfig.java` có `.requestMatchers(..., "/ws/**").permitAll()`; `WebSocketConfig` tồn tại nhưng chưa thấy interceptor/auth participant validation.
- Impact: Khi messaging được bật, client không xác thực có thể connect/subscribe/send nếu handler được bổ sung sau này mà quên khóa lại. Đây là rủi ro security foundation.
- Recommendation: Nếu WebSocket mới là placeholder, ghi rõ disabled/non-production. Nếu giữ endpoint, thêm handshake/token auth strategy, channel interceptor và authorization theo conversation/user queue trước khi expose.
- Priority: HIGH.
- Must fix in RUN #2: Có, nếu RUN #2 bật WebSocket foundation public.

### HIGH-03: Thiếu migration/schema thực tế cho database design

- Problem: Database design đã có ERD/tables nhưng backend chưa có Flyway/Liquibase migration, entity hoặc repository tương ứng.
- Evidence: `docs/database/database-design.md` nói phase đầu nên thêm `V1__initial_schema.sql`; repo không có `backend/src/main/resources/db/migration`.
- Impact: Không có schema executable để verify database constraints, index, FK, UUID, created/updated timestamps. Các API hiện không thể chuyển sang persistence thật một cách an toàn.
- Recommendation: Thêm migration nền tảng cho các bảng core cần RUN #2, hoặc nếu chưa implement DB trong RUN #2 thì cập nhật scope/status rõ ràng trong docs để không bị hiểu là đã hoàn tất.
- Priority: HIGH.
- Must fix in RUN #2: Có, nếu RUN #2 claim database foundation.

### MEDIUM-01: Response contract thành công chưa bao phủ error type trong wrapper chung

- Problem: `ApiResponse<T>` chỉ có `success`, `data`, `meta`; error dùng `ErrorResponse` riêng. Tài liệu API mô tả format success/error nhất quán nhưng implementation có hai shape độc lập.
- Evidence: `backend/src/main/java/com/edualto/common/api/ApiResponse.java` không có `error/timestamp/path`; `GlobalExceptionHandler` trả `ErrorResponse`.
- Impact: Frontend phải xử lý hai type response khác nhau, dễ lệch contract khi codegen/OpenAPI.
- Recommendation: Quyết định rõ contract: hoặc giữ separate success/error và cập nhật docs/OpenAPI, hoặc tạo wrapper chung có `error`, `timestamp`, `path` cho error.
- Priority: MEDIUM.
- Must fix in RUN #2: Không bắt buộc nếu docs được chỉnh rõ; nên fix nếu RUN #2 mục tiêu API contract.

### MEDIUM-02: Frontend course data chưa nối API client/config

- Problem: Home page dùng `popularCourses` từ constants, chưa có API client/env helper dù frontend rules yêu cầu không hard-code API URL rải rác và nền tảng nên có `src/lib`/service API.
- Evidence: `frontend/src/features/home/home-page.tsx` map `popularCourses`; `frontend/src/constants/home.ts` chứa course demo content; không thấy API client cho `/api/v1/courses`.
- Impact: UI đẹp cho demo nhưng chưa validate integration contract với backend, không có loading/error/empty state thật cho course list.
- Recommendation: Thêm API client/config helper và server-side fetch hoặc documented mock boundary. Nếu chưa nối API trong RUN #2, ghi status là static demo.
- Priority: MEDIUM.
- Must fix in RUN #2: Phụ thuộc scope; nên fix nếu RUN #2 yêu cầu frontend-backend integration.

### MEDIUM-03: Test coverage còn quá mỏng cho foundation risk

- Problem: Backend chỉ có application smoke và CourseController demo test; frontend chỉ test Button loading. Chưa có test auth validation `confirmPassword`, error format, security rules, responsive/header behavior hoặc course empty/loading states.
- Evidence: `backend/src/test/java/com/edualto/course/CourseControllerTest.java`; `frontend/src/components/ui/button.test.tsx`.
- Impact: Các contract quan trọng có thể regression mà CI không bắt được.
- Recommendation: Thêm controller validation tests, service tests cho auth/course khi implement thật, frontend tests cho Header/Button/CourseCard state quan trọng.
- Priority: MEDIUM.
- Must fix in RUN #2: Không toàn bộ, nhưng phải có test cho các CRITICAL/HIGH được sửa.

### MEDIUM-04: UI thiếu một số phần Figma đã ghi nhận

- Problem: Home UI có header, hero, feature, course, footer nhưng chưa có stable hero student asset, social icons/footer secondary details, course detail/reviews/chatbot UI.
- Evidence: `docs/ui/figma-analysis.md` ghi có course detail/review và chatbot `Alto Bot`; repo hiện chỉ có `HomePage`, `AppHeader`, `CourseCard`, `FeatureCard`, `Footer`; không thấy `ChatWidget`, `RatingDistribution`, course detail page.
- Impact: Nếu RUN #2 kỳ vọng bám Figma rộng hơn homepage, UI coverage chưa đủ. Nếu scope chỉ homepage foundation thì đây là gap chấp nhận được nhưng cần ghi rõ.
- Recommendation: Scope rõ phần nào từ Figma thuộc RUN #2. Với homepage, ưu tiên thay hero placeholder bằng stable asset và bổ sung footer/social nếu có trong Figma.
- Priority: MEDIUM.
- Must fix in RUN #2: Có nếu RUN #2 yêu cầu Figma parity ngoài homepage; không nếu chỉ foundation homepage.

### LOW-01: Một số nav/link đang là placeholder `#`

- Problem: Header/footer/mobile nav nhiều link trỏ `#`.
- Evidence: `frontend/src/components/layout/app-header.tsx` và `frontend/src/components/layout/footer.tsx`.
- Impact: UX demo có thể gây nhầm lẫn, không phản ánh route map thật.
- Recommendation: Nếu route chưa có, dùng disabled/coming-soon state tiếng Việt hoặc tạo route placeholder có nội dung empty state.
- Priority: LOW.
- Must fix in RUN #2: Không bắt buộc trừ khi demo cần điều hướng đầy đủ.

### LOW-02: Build artifacts tồn tại trong workspace dù đã được ignore

- Problem: Cây workspace có `frontend/.next`, `frontend/node_modules`, `backend/target`, `frontend/tsconfig.tsbuildinfo`.
- Evidence: `rg --files` liệt kê các artifacts này; `.gitignore` đã ignore các đường dẫn tương ứng.
- Impact: Không phải lỗi nếu chưa tracked, nhưng làm audit/search nhiễu và tăng rủi ro commit nhầm nếu rule ignore thay đổi.
- Recommendation: Giữ nguyên nếu cần local dev, nhưng trước commit nên kiểm tra `git status --short` và không add artifacts.
- Priority: LOW.
- Must fix in RUN #2: Không.

## Checklist A-V

| Mục | Trạng thái | Evidence | Nhận xét |
| --- | --- | --- | --- |
| A. AGENTS.md compliance | PARTIAL | UI copy phần lớn tiếng Việt; source code tiếng Anh | Auth controller chứa logic stub, chưa delegate service. |
| B. Modular monolith | PASS | Package `com.edualto` có module markers | Chưa thấy dấu hiệu microservices. |
| C. Module boundaries | PARTIAL | Nhiều module mới `package-info.java` | Boundaries documented, implementation còn rất mỏng. |
| D. Backend dependency direction | PARTIAL | Course controller gọi service | Auth controller chưa gọi service. |
| E. API prefix `/api/v1` | PASS | Auth/course/health dùng `/api/v1` | Prefix đúng ở endpoint hiện có. |
| F. Response/error format | PARTIAL | `ApiResponse`, `ErrorResponse`, `GlobalExceptionHandler` | Success/error wrapper chưa thống nhất hoàn toàn với docs. |
| G. Auth/register foundation | FAIL | `AuthController` trả stub | CRITICAL-01. |
| H. Security baseline | PARTIAL | Spring Security, BCrypt, CORS | WebSocket public, chưa JWT/session auth. |
| I. Database PostgreSQL readiness | FAIL | Default H2, không migration | HIGH-01/HIGH-03. |
| J. Course catalog API | FAIL | Hard-code service data | CRITICAL-02. |
| K. Pagination/search/filter | FAIL | `CourseController` không nhận params | API design chưa implemented. |
| L. OpenAPI docs | PARTIAL | Có `OpenApiConfig` | Chưa verify schema phản ánh endpoint đầy đủ. |
| M. WebSocket/realtime | PARTIAL | Có `WebSocketConfig` và dependency | Security/authorization chưa đủ. |
| N. Redis/cache readiness | PARTIAL | Config redis trong `application.yml` | Chưa có use case/cache integration. |
| O. Frontend structure | PASS | `src/components`, `src/features`, `src/lib`, `src/types` | Phù hợp AGENTS.md. |
| P. Vietnamese UX copy | PASS | Header/home/footer/button dùng tiếng Việt | Course titles có một số English/brand term do demo. |
| Q. Figma token alignment | PASS | Tailwind token khớp docs | Primary/heading/muted/footer/accent đúng. |
| R. Responsive UI | PARTIAL | Header mobile menu, grids responsive | Chưa visual QA trực tiếp, hero stats có thể cần kiểm tra mobile. |
| S. UI states/accessibility | PARTIAL | Button loading/disabled/focus, labels search | Chưa có form validation states, toast/modal/chat states. |
| T. Frontend-backend integration | FAIL | Home dùng constants | Chưa fetch API thật. |
| U. Test coverage | PARTIAL | Có test rất cơ bản | Thiếu tests cho flows rủi ro. |
| V. Git hygiene | PASS | `.gitignore` ignore artifacts/secrets | Workspace có artifacts local nhưng `git status --short` ban đầu sạch. |

## Kết luận approve

Không nên approve RUN #2 nếu scope được hiểu là backend/frontend foundation có auth, course catalog, database và security khả dụng. Có thể approve có điều kiện nếu RUN #2 chỉ là scaffold/demo foundation và các gap trên được chuyển thành backlog rõ ràng, nhưng CRITICAL/HIGH cần được xử lý trước khi gọi là implementation foundation hoàn chỉnh.

