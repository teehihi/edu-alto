# Project audit — 2026-10-04

Rà soát mã frontend/backend, cấu hình khởi chạy, ranh giới API, migration và bộ kiểm thử hiện có. Lượt rà soát không sửa database ứng dụng và không gọi thanh toán thật.

## Các vấn đề đã sửa

| Mức độ | Vấn đề xác nhận | Cách sửa và kiểm chứng |
| --- | --- | --- |
| High | Database password và JWT secret có giá trị mặc định trong source/Compose. | Bắt buộc biến môi trường; template để trống secret; Compose yêu cầu điền cấu hình. |
| High | Cùng refresh token có thể xoay nhiều lần đồng thời; thu hồi token của tài khoản không ACTIVE bị rollback khi trả 401. | Write lock và transaction policy nhất quán; test 6 request đồng thời chỉ 1 request thành công; test thu hồi token được lưu. |
| High | Request OTP đồng thời có thể làm mất bộ đếm nhập sai; OTP bị tiêu thụ riêng trước khi đổi mật khẩu hoặc kích hoạt tài khoản commit. | Write lock, transaction chung và giữ lần nhập sai khi trả business error; tests đồng thời và rollback đổi mật khẩu. |
| High | Reset OTP đã verify vẫn dùng được sau khi chạm giới hạn lần nhập sai; lần verify đúng lại bị tính như một lần sai. | Chỉ tăng bộ đếm cho mã sai; kiểm tra giới hạn trước khi tiêu thụ; tests mã đúng cũng bị từ chối sau khi khóa. |
| High | Login tài khoản chưa xác thực tự thay OTP, có thể reset attempts và gặp rollback lỗi nếu SMTP không hoạt động. | Login chỉ trả trạng thái chưa xác thực; gửi lại mã qua endpoint riêng có cooldown; test OTP và attempts không thay đổi khi login lặp. |
| High | Verify email có thể kích hoạt lại tài khoản LOCKED/DISABLED; một số API giảng viên chỉ kiểm tra role. | Chỉ kích hoạt PENDING_VERIFICATION; thao tác course/curriculum/video cần ACTIVE; regression tests. |
| High | Endpoint hồ sơ công khai trả email, trạng thái tài khoản, object key và timestamps nội bộ. | PublicProfileResponse riêng, ẩn tài khoản không ACTIVE; tests cả hai URL công khai và API cá nhân. |
| High | Avatar cũ bị xóa khỏi storage trước khi transaction lưu avatar mới commit. | Dùng StorageCleanupService sau commit; test rollback giữ cả key và object cũ. |
| High | Auth credential endpoints không có HTTP rate limiting. | Bộ đếm theo servlet IP có giới hạn bộ nhớ, trả 429 và Retry-After; tests đồng thời, hết cửa sổ, dung lượng cache, filter và Spring Security chain. |
| High | Checksum VNPay dùng %20 thay cho dấu + và ký cả vnp_SecureHashType ở URL 2.1.0. | Form URL encoding, bỏ SecureHashType khỏi URL, bỏ giá trị rỗng khi ký; tests URL checkout và IPN có dấu cách/field tùy chọn rỗng. |
| Medium | Callback frontend vẫn dùng access token cũ ngay sau refresh; response refresh chậm có thể khôi phục phiên sau logout. | Đọc token mới qua ref, kiểm tra phiên bản phiên, tuần tự refresh với login/logout; tests token ngay sau refresh và logout khi refresh chưa xong. |
| Medium | Xem hồ sơ người khác ghi đè avatar của tài khoản đang đăng nhập. | Chỉ đồng bộ avatar cho chủ hồ sơ; regression assertion trong component test. |
| Medium | Login bỏ qua next, làm mất luồng quay lại checkout/học tập. | Quay về URL cùng origin, từ chối URL ngoài; tests checkout continuation và URL không an toàn. |
| Medium | Trang kết quả thanh toán thông báo tự cập nhật nhưng chỉ tải trạng thái một lần. | Poll mỗi 10 giây khi pending/review, ngừng khi có kết quả cuối hoặc rời trang; component tests. |
| Medium | Multipart mặc định 1 MB trong khi avatar cho phép 5 MB; file quá lớn có thể trả lỗi chung. | max-file-size 5 MB, max-request-size 6 MB; lỗi parser 413 tiếng Việt; test file đúng 5 MB và vượt giới hạn service. |
| Medium | Password dưới 72 ký tự nhưng trên 72 UTF-8 byte gây lỗi BCrypt/500. | Kiểm tra byte trước encode và trước tiêu thụ reset OTP; test mật khẩu Unicode. |
| Medium | Lỗi fetch có thể hiển thị thông báo kỹ thuật tiếng Anh. | ApiClientError NETWORK_ERROR tiếng Việt; giữ cancellation và validation details; unit tests. |
| Medium | Compose không chuyển biến cấu hình VNPay vào backend. | Bổ sung cả bốn biến vào Compose và .env.example; kiểm tra Compose config. |
| Low | README có API paths, SameSite, migrations và frontend port cũ. | Đồng bộ các endpoint đã kiểm tra trong controller, V1–V17 và port 3002; cập nhật API/security docs. |

VNPay đối chiếu với [tài liệu tích hợp chính thức](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html), đặc biệt quy tắc tạo hash/querystring và xử lý IPN. Tests không tạo giao dịch tại cổng thanh toán.

## Kiểm chứng

- `pnpm frontend:lint:fast`: pass, 0 warning/error.
- `pnpm frontend:lint`: pass, 0 warning/error.
- `pnpm frontend:fmt:check`: pass.
- `pnpm frontend:typecheck`: pass.
- `pnpm --dir frontend test`: 24 files, 86 tests pass.
- `pnpm backend:test`: 104 tests pass, 0 failure/error/skipped; Testcontainers PostgreSQL 16, 17 Flyway migrations được áp dụng thành công.
- `pnpm --dir frontend build --webpack`: production build pass, 33 pages được prerender/thu thập theo route configuration.
- `./backend/mvnw -f backend/pom.xml -DskipTests package`: JAR packaging pass sau khi chạy tests.
- `docker compose config --quiet`: pass.
- `git diff --check`: pass.

`pnpm frontend:build` dùng Turbopack vẫn gặp lỗi môi trường `binding to a port / Operation not permitted` khi xử lý PostCSS, kể cả lần chạy ngoài sandbox được cấp quyền. Webpack đã build thành công; không đổi bundler mặc định của dự án.

## Giới hạn và lưu ý vận hành

- SMTP, R2 và VNPay thật chưa được kiểm chứng end-to-end trong lượt này. Storage và payment behavior được kiểm tra bằng mock/test fixtures; không dùng thông tin thanh toán hay tài khoản thật.
- Multipart tests dùng MockMvc để xác minh giới hạn cấu hình và logic endpoint/service; chưa chạy test parser multipart qua một HTTP server thật.
- Rate limiting hiện theo IP trong một process, mặc định 60 request/60 giây, tối đa 10.000 IP. Triển khai nhiều backend cần counter chung/ingress limit; proxy cần cấu hình trusted client IP để tránh gom mọi người dùng vào IP của proxy. Không tin X-Forwarded-For tùy ý từ client.
- Không thay đổi các module/endpoint còn nằm trong roadmap thành tính năng hoàn chỉnh. Báo cáo audit cũ trong docs/audit là lịch sử, không phải trạng thái code hiện tại.
- Rà soát và tests không chứng minh toàn bộ ứng dụng không còn lỗi. Chưa chạy visual QA trên mọi kích thước màn hình hoặc thử tải đồng thời toàn hệ thống.
