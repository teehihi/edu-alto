# Tổng kết thay đổi EduAlto

## Phạm vi đối chiếu

Tài liệu này được viết lại hoàn toàn để tổng kết các thay đổi từ commit gần nhất trước lượt làm việc này (`ed18b4a`, `db update: 8 migration`) đến workspace hiện tại.

## Thay đổi đã thực hiện

### Backend

- Khóa endpoint WebSocket khỏi chế độ public mặc định; các request tới `/ws/**` phải đi qua security chain.
- Mở rộng `GET /api/v1/courses` với `q`, `category`, `page` và `size`.
- Hỗ trợ tìm theo tiêu đề/mô tả, lọc theo danh mục và response phân trang có `PageMeta`.
- Giới hạn kích thước trang từ `1` đến `50`, đồng thời xử lý input query rỗng và chuẩn hóa chữ thường.
- Chuyển datasource mặc định từ H2 sang PostgreSQL local với URL `jdbc:postgresql://localhost:5432/edualto`.
- Bật Flyway rõ ràng trong cấu hình Spring Boot.

### Frontend

- Homepage chuyển từ chỉ đọc course demo tĩnh sang gọi API `/api/v1/courses`.
- Tạo `frontend/src/lib/courses-api.ts` làm lớp gọi API tập trung.
- Bổ sung fallback về dữ liệu demo khi backend chưa chạy, API lỗi hoặc response không hợp lệ.
- Ánh xạ response backend sang kiểu `Course` mà các component hiện tại sử dụng.
- Giữ nguyên UI tiếng Việt, responsive layout và design token EduAlto.

### Tài liệu và sơ đồ

- Cập nhật sơ đồ use case thành mô hình actor-centric.
- Bổ sung phân cấp `Guest`, `Base User`, `Student`, `Instructor`, `Administrator`.
- Bổ sung `Automated System` cho các tác vụ tự động.
- Nhóm use case theo domain khách, học viên, giảng viên, quản trị và hệ thống.
- Bổ sung quan hệ trigger giữa quiz, tiến độ, chấm tự động và cấp chứng chỉ.

## Kiểm tra

- Đã kiểm tra diff và trạng thái Git trước khi commit.
- Frontend typecheck đã được khởi chạy.
- Backend chưa thể compile trên môi trường hiện tại vì JDK thấp hơn Java 25; Maven báo `release version 25 not supported`.
- Course catalog đã có filter/pagination ở API, nhưng nguồn dữ liệu vẫn là demo. Bước tiếp theo để đạt production là thay bằng entity/repository PostgreSQL thật.

## Trạng thái bàn giao

Các thay đổi được gom vào một commit riêng sau tài liệu này. Không commit secret, `node_modules`, build artifact hoặc file môi trường local.
