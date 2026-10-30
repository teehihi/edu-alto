# TỔNG KẾT TRIỂN KHAI TÍNH NĂNG NỀN TẢNG EDUALTO

Tài liệu này ghi lại chi tiết các công việc đã triển khai, hoàn thành và kiểm thử toàn diện trên nền tảng EduAlto, bao gồm 3 tính năng trọng tâm:
1. **Cấp và xác thực chứng chỉ điện tử (E-Certificate)**: Tự động cấp, xuất file PDF bảo mật cao cấp và trang xác thực công khai qua mã QR (EDU-47, EDU-89, EDU-90).
2. **Hệ thống Hỏi & Đáp / Thảo luận bài học (Lesson Q&A Discussions)**: Thảo luận gắn mốc thời gian video, bình luận phân cấp, huy hiệu Giảng viên (EDU-15 / EDU-49).
3. **Hệ thống WebSocket gửi thông báo tức thời (Real-time Push Notifications)**: Đẩy thông báo tức thời qua WebSocket STOMP khi giảng viên giải đáp thắc mắc hoặc học viên mới đăng ký khóa học.

---

## 1. Nghiệp vụ & Kiến trúc đã hoàn thành

### 1.1. Cấp và xác thực chứng chỉ điện tử (EDU-47 / EDU-89 / EDU-90)
- **Tự động cấp chứng chỉ**: Học viên hoàn thành 100% bài học sẽ được tự động cấp chứng chỉ định danh chuẩn `EA-<HEX>`. Sử dụng khóa bi quan (`SELECT ... FOR UPDATE`) chống cấp trùng lặp.
- **Xuất PDF với Tem bảo mật chống làm giả**:
  - Dùng **Apache PDFBox 3.0.8**, khổ ngang **A4 Landscape**.
  - Nhúng logo chính thức của EduAlto (`images/logo-with-text.png`).
  - Tem bảo mật vector đa tầng: Vành hoa cúc 36 cánh răng cưa mạ vàng kim (`#D4AF37`), dải ruy băng đôi, vành tròn men ngọc `#20B486` và chùm 5 ngôi sao vàng.
  - Viền vi chữ bảo mật (Microtext Border): Dải vi chữ 4.2pt chống photocopy giả mạo.
  - Mã băm SHA-256 chống sửa đổi dữ liệu (SEC-HASH).
  - Mã QR Code động dẫn trực tiếp tới trang xác thực.
- **Trang xác thực công khai qua mã QR**:
  - Truy cập công khai không cần đăng nhập tại `/certificates/verify/{code}`.
  - Tối ưu Server-Side Pre-fetch hiển thị tức thì (0ms loading) trên di động.
  - 4 khối thẻ thông số (Học viên, Ngày cấp, Mã văn bằng, Giảng viên).
  - Tải file PDF gốc, chia sẻ mạng xã hội (Web Share API) và xem nội dung khóa học.

### 1.2. Hệ thống Thảo luận & Hỏi đáp bài học (EDU-15 / EDU-49)
- **Gắn mốc thời gian video (Video Timestamp)**:
  - Cho phép đính kèm thời điểm video (ví dụ: `02:05`) khi đặt câu hỏi thắc mắc.
  - Bấm vào mốc thời gian sẽ tự động tua trình phát video bài học đến đúng giây tương ứng.
- **Tương tác đa tầng (Threaded Discussions & Comments)**:
  - Hỗ trợ câu hỏi gốc và các phản hồi lồng nhau (`parent_comment_id`).
  - Tự động nhận diện và gán huy hiệu nổi bật cho Giảng viên phụ trách khóa học (`isCourseInstructor`).
  - Lọc câu hỏi có mốc video, tìm kiếm nội dung câu hỏi, sắp xếp theo mới nhất / cũ nhất.
  - Phân quyền: Học viên/Giảng viên có quyền xóa bài đăng hoặc bình luận của chính mình; Giảng viên khóa học và Admin có toàn quyền điều hành thảo luận.
- **Cơ sở dữ liệu**: Bảng `discussions` và `discussion_comments` với khóa ngoại, chỉ mục tìm kiếm và soft delete (`deleted_at`).

### 1.3. Hệ thống WebSocket gửi thông báo tức thời (Real-time Push Notifications)
- **Hạ tầng WebSocket & STOMP**:
  - Kích hoạt STOMP broker tại `/ws` với hỗ trợ SockJS fallback.
  - Xác thực bảo mật: Hỗ trợ query parameter `?token=` trong HTTP upgrade handshake và header `Authorization: Bearer <token>` trong STOMP `CONNECT` frame.
  - Prefix kênh: `/topic`, `/queue`, tiền tố cá nhân `/user`.
  - Tích hợp `Principal` trong Spring Security để định tuyến đích danh người dùng (`/user/queue/notifications`) và `/topic/notifications/{userId}`.
- **Tự động kích hoạt thông báo đẩy**:
  - **Giảng viên trả lời câu hỏi**: Khi giảng viên (hoặc bạn học) phản hồi thắc mắc trong bài học, hệ thống đẩy ngay thông báo tới tác giả câu hỏi kèm đường dẫn quay lại bài học.
  - **Học viên mới đăng ký khóa học**: Khi học viên ghi danh thành công, hệ thống gửi thông báo đẩy ngay lập tức cho giảng viên phụ trách khóa học.
- **Bền vững hóa dữ liệu (Persistence)**:
  - Bảng `notifications` lưu trữ lịch sử, loại thông báo (`NotificationType`), trạng thái đã đọc (`read_at`), tiêu đề, nội dung và liên kết điều hướng.
  - Phân quyền RBAC qua migration `V33`: Phân quyền `VIEW_REALTIME_NOTIFICATIONS`, `MARK_REALTIME_NOTIFICATION_READ`, `MARK_ALL_REALTIME_NOTIFICATIONS_READ` cho `STUDENT`, `INSTRUCTOR` và `ADMIN`.
- **Phía Frontend Client**:
  - Client STOMP thuần (`realtime-notification-client.ts`): Kết nối native WebSocket, tự động parse frame STOMP, quản lý heartbeat ping/pong và reconnect thông minh theo hàm mũ.
  - Hook React `useRealtimeNotifications.ts`: Quản lý danh sách thông báo, số lượng chưa đọc (`unreadCount`), trạng thái trực tiếp (`isConnected`).
  - Component `RealtimeNotificationRow.tsx`: Trình bày thẻ thông báo chuẩn UX, icon theo loại (emerald cho hỏi đáp, blue cho ghi danh mới), định dạng thời gian tương đối ("Vừa xong", "5 phút trước"), chấm xanh chưa đọc.
  - Tích hợp `StudentAnnouncementBell`: Chuông thông báo hoạt động cho cả Học viên và Giảng viên, có badge "Trực tiếp", đồng bộ số lượng chưa xem và nút "Đánh dấu tất cả đã đọc".

---

## 2. Danh mục tệp tin triển khai

### Backend (Java / Spring Boot / WebSocket STOMP)
- `backend/src/main/resources/db/migration/V32__lesson_discussions_and_comments.sql` *(Tạo mới)*: Migration bảng thảo luận và bình luận hỏi đáp.
- `backend/src/main/resources/db/migration/V33__realtime_notifications.sql` *(Tạo mới)*: Migration bảng thông báo đẩy và cấu hình quyền RBAC.
- `backend/src/main/java/com/edualto/common/config/WebSocketConfig.java` *(Tạo mới)*: Cấu hình STOMP broker, SockJS, JWT ChannelInterceptor.
- `backend/src/main/java/com/edualto/common/security/AuthenticatedUser.java`: Thêm `java.security.Principal` định danh ID người dùng cho STOMP destination.
- `backend/src/main/java/com/edualto/common/security/JwtAuthenticationFilter.java`: Hỗ trợ token query param cho handshake `/ws`.
- `backend/src/main/java/com/edualto/common/security/SecurityConfig.java`: Cho phép bảo mật `/ws` và CORS LAN.
- `backend/src/main/java/com/edualto/notification/domain/Notification.java` *(Tạo mới)*: Entity thông báo.
- `backend/src/main/java/com/edualto/notification/domain/NotificationType.java` *(Tạo mới)*: Enum loại thông báo (`DISCUSSION_REPLY`, `NEW_ENROLLMENT`...).
- `backend/src/main/java/com/edualto/notification/repository/NotificationRepository.java` *(Tạo mới)*: Repository truy vấn thông báo và đếm unread.
- `backend/src/main/java/com/edualto/notification/service/RealtimeNotificationService.java` *(Tạo mới)*: Dịch vụ gửi STOMP push và lưu thông báo.
- `backend/src/main/java/com/edualto/notification/controller/RealtimeNotificationController.java` *(Tạo mới)*: REST API `/api/v1/me/realtime-notifications`.
- `backend/src/main/java/com/edualto/discussion/`: Trọn bộ module thảo luận (`Discussion`, `DiscussionComment`, DTOs, Repository, Service, Controller).
- `backend/src/main/java/com/edualto/discussion/service/DiscussionService.java`: Kích hoạt thông báo khi có phản hồi mới.
- `backend/src/main/java/com/edualto/enrollment/service/EnrollmentService.java`: Kích hoạt thông báo tới giảng viên khi có học viên ghi danh mới.

### Frontend (Next.js / TypeScript / Tailwind CSS)
- `frontend/src/lib/discussion-client.ts` *(Tạo mới)*: API client cho tính năng hỏi đáp bài học.
- `frontend/src/lib/realtime-notification-client.ts` *(Tạo mới)*: Client WebSocket STOMP native & REST methods.
- `frontend/src/features/notification/use-realtime-notifications.ts` *(Tạo mới)*: Hook quản lý trạng thái realtime notifications.
- `frontend/src/features/notification/realtime-notification-row.tsx` *(Tạo mới)*: Component hiển thị một mục thông báo đẩy thời gian thực.
- `frontend/src/features/notification/student-announcement-bell.tsx`: Nâng cấp chuông thông báo, tích hợp realtime socket, badge "Trực tiếp", hỗ trợ cả Học viên & Giảng viên.
- `frontend/src/features/learning/learning-lesson-discussions.tsx` *(Tạo mới)*: Giao diện Hỏi đáp bài học, liên kết tua video.
- `frontend/src/features/learning/learning-lesson-page.tsx`: Tích hợp tab Hỏi & Đáp vào giao diện học tập.
- `frontend/src/features/certificate/verify-certificate-page.tsx`: Giao diện xác thực chứng chỉ qua mã QR.

---

## 3. Kết quả kiểm thử tự động (Unit & Integration Tests)

1. **Kiểm thử Hỏi & Đáp bài học (Discussions)**:
   - File test: `frontend/src/features/learning/learning-lesson-discussions.test.tsx`
   - Kết quả: **4/4 passed (100%)**
   - Bao gồm: Render danh sách thảo luận, tạo câu hỏi có mốc video, tua video khi bấm timestamp, phản hồi bình luận.

2. **Kiểm thử Chuông thông báo Real-time (WebSocket Bell)**:
   - File test: `frontend/src/features/notification/student-announcement-bell.test.tsx`
   - Kết quả: **3/3 passed (100%)**
   - Bao gồm: Hiển thị badge số lượng chưa đọc, mở dialog hiển thị trạng thái kết nối trực tiếp, hiển thị thông báo đẩy, thao tác đánh dấu tất cả đã đọc.

3. **Kiểm thử Xác thực chứng chỉ điện tử (Verify Certificate)**:
   - File test: `frontend/src/features/certificate/verify-certificate-page.test.tsx`
   - Kết quả: **3/3 passed (100%)**

---

## 4. Hướng dẫn nghiệm thu tính năng

### Kịch bản 1: Giảng viên phản hồi câu hỏi của học viên (WebSocket Push)
1. **Tab 1 (Học viên)**: Đăng nhập tài khoản học viên, vào bài học bất kỳ, chọn tab **Hỏi đáp**, đăng câu hỏi kèm mốc thời gian video.
2. **Tab 2 (Giảng viên phụ trách)**: Đăng nhập tài khoản giảng viên, mở câu hỏi và gửi câu trả lời.
3. **Quan sát Tab 1**:
   - Không cần tải lại trang: Chuông thông báo trên Header lập tức xuất hiện chấm thông báo mới.
   - Bấm chuông: Có badge **"Trực tiếp"** và thông báo *"Giảng viên đã giải đáp câu hỏi của bạn: [Tên câu hỏi]"*.
   - Bấm vào thông báo sẽ tự động chuyển đến đúng bài học và đánh dấu đã đọc.

### Kịch bản 2: Học viên mới đăng ký khóa học (WebSocket Push)
1. **Tab 2 (Giảng viên)**: Đang mở trang web.
2. **Tab 1 (Học viên)**: Ghi danh một khóa học của Giảng viên đó.
3. **Quan sát Tab 2**:
   - Chuông của Giảng viên lập tức báo có thông báo mới: *"Học viên mới đăng ký khóa học: Học viên [Tên] vừa đăng ký khóa học [Tên khóa học]"*.

### Kịch bản 3: Hỏi đáp gắn mốc video
1. Trong bài học có video, kéo thanh tiến trình video đến một thời điểm (ví dụ: `01:45`).
2. Bấm vào nút đính kèm mốc video hiện tại và gửi thắc mắc.
3. Câu hỏi hiển thị huy hiệu `01:45`. Khi bấm vào huy hiệu này, trình phát video lập tức nhảy tới đúng giây thứ 105.
