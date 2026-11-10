# BỘ GIÁO DỤC VÀ ĐÀO TẠO
# TRƯỜNG ĐẠI HỌC SƯ PHẠM KỸ THUẬT TP. HỒ CHÍ MINH
## KHOA ĐÀO TẠO CHẤT LƯỢNG CAO - NGÀNH CÔNG NGHỆ THÔNG TIN

---

# BÁO CÁO TIẾN ĐỘ TUẦN 9
**(31/10/2026 – 06/11/2026)**

### TIỂU LUẬN CHUYÊN NGÀNH
## THIẾT KẾ VÀ XÂY DỰNG HỆ THỐNG QUẢN LÝ HỌC TẬP TRỰC TUYẾN EDUALTO
**(EDUALTO - ONLINE LEARNING MANAGEMENT SYSTEM)**

- **Giảng viên hướng dẫn**: PGS.TS. Hoàng Văn Dũng
- **Nhóm sinh viên thực hiện đề tài**:
  1. **Phạm Văn Hậu** - MSSV: 23110098 (Nhóm trưởng / Fullstack Architect)
  2. **Nguyễn Nhật Thiên** - MSSV: 23110153 (Frontend Lead / UI-UX Developer)
  3. **Trương Công Anh** - MSSV: 23110075 (Backend Developer / QA & Test Lead)

*TP. Hồ Chí Minh, Ngày 06 Tháng 11 Năm 2026*

---

## NHIỆM VỤ TIỂU LUẬN CHUYÊN NGÀNH

**1. Họ và tên sinh viên thực hiện:**
- Phạm Văn Hậu – MSSV: 23110098
- Nguyễn Nhật Thiên – MSSV: 23110153
- Trương Công Anh – MSSV: 23110075

**2. Ngành đào tạo:** Công nghệ Thông tin

**3. Tên đề tài:** Thiết kế và xây dựng hệ thống quản lý học tập trực tuyến EduAlto

**4. Giảng viên hướng dẫn:** PGS.TS. Hoàng Văn Dũng

**5. Nhiệm vụ của đề tài:**
Xây dựng nền tảng Web học tập trực tuyến EduAlto kết hợp giữa trải nghiệm Marketplace hiện đại và quản lý học tập chuyên sâu LMS, bao gồm các phân hệ chức năng chính:

**a) Phía Người học (Student):**
- Đăng ký tài khoản, xác thực mã OTP qua email, đăng nhập và bảo mật thông tin cá nhân.
- Khám phá, tìm kiếm và lọc khóa học theo danh mục, từ khóa, trình độ và giá cả.
- Xem chi tiết khóa học, đề cương bài học, thông tin giảng viên và đánh giá học viên.
- Quản lý giỏ hàng, thực hiện quy trình đăng ký ghi danh khóa học.
- Tham gia học tập đa phương tiện (video bài giảng, tài liệu), đánh dấu hoàn thành và ghi chú.
- Thực hiện bài kiểm tra trắc nghiệm (Quiz) và nộp bài tập tự luận (Assignment).
- Theo dõi tiến độ học tập trực quan và nhận chứng chỉ hoàn thành khóa học điện tử có tem bảo mật và mã QR xác thực.
- Trao đổi thảo luận đa tầng (Q&A Discussions) gắn mốc thời gian video bài học, nhận thông báo đẩy thời gian thực qua WebSocket.

**b) Phía Giảng viên (Instructor / Teacher / Mentor):**
- Quản lý hồ sơ chuyên môn, tiểu sử, kinh nghiệm và kỹ năng sư phạm.
- Xây dựng và số hóa chương trình đào tạo với công cụ trực quan (Curriculum Builder).
- Tạo và quản lý các học phần (Sections), bài học (Lessons), bài kiểm tra (Quiz) và bài tập (Assignment).
- Theo dõi danh sách học viên ghi danh, tiến độ học tập và kết quả của từng học viên.
- Nhận thông báo đẩy thời gian thực khi có học viên mới ghi danh hoặc đăng câu hỏi thắc mắc.
- Trả lời câu hỏi thắc mắc của học viên trực tiếp trên bài học với huy hiệu Giảng viên phụ trách nổi bật.

**c) Phía Quản trị viên (Administrator):**
- Quản lý toàn bộ tài khoản người dùng, phân quyền truy cập động theo vai trò (Dynamic RBAC).
- Quản trị danh mục khóa học, lĩnh vực chuyên ngành và từ khóa hệ thống.
- Kiểm duyệt chất lượng nội dung khóa học trước khi cho phép xuất bản công khai.
- Điều hành, quản lý hệ thống thảo luận hỏi đáp toàn sàn.
- Theo dõi thống kê tổng thể hệ thống: người dùng, khóa học, ghi danh và dữ liệu vận hành.

**d) Phía Hệ thống tự động (System):**
- Tự động sinh mã OTP xác minh email có thời hạn và giới hạn số lần thử.
- Tự động tính toán tiến độ học tập, chấm điểm bài kiểm tra trắc nghiệm (Quiz).
- Tự động cấp chứng chỉ hoàn thành điện tử với cơ chế khóa bi quan chống trùng lặp dữ liệu (`SELECT ... FOR UPDATE`).
- Tự động kết xuất file PDF chứng chỉ khổ A4 ngang với tem bảo mật vector đa tầng, viền vi chữ chống photocopy giả mạo, mã băm SHA-256 chống sửa đổi và mã QR xác thực tức thì.
- Tự động phân phối thông báo đẩy qua hạ tầng WebSocket STOMP Broker đích danh đến từng người dùng.

---

## BẢNG PHÂN CHIA CÔNG VIỆC VÀ TỶ LỆ HOÀN THÀNH (TUẦN 9)

| STT | Họ và tên | MSSV | Nhiệm vụ phân công cụ thể trong Tuần 9 | Kết quả thực hiện | Tỷ lệ |
|---|---|---|---|---|---|
| 1 | **Phạm Văn Hậu** *(Nhóm trưởng)* | 23110098 | - Thiết kế kiến trúc WebSocket STOMP Broker và luồng đẩy thông báo thời gian thực.<br>- Cấu hình Spring Security: Hỗ trợ xác thực JWT trong HTTP Upgrade Handshake `/ws` và frame STOMP `CONNECT`.<br>- Phát triển backend `RealtimeNotificationService`, `RealtimeNotificationController`.<br>- Phát triển thuật toán bảo mật tem vector đa tầng (Guilloche wave, viền vi chữ Microtext 4.2pt, mã băm toàn vẹn SHA-256) trong `CertificatePdfGenerator`.<br>- Tối ưu hóa cơ chế khóa bi quan (`SELECT ... FOR UPDATE`) chống cấp trùng chứng chỉ. | Hoàn thiện 100% backend WebSocket, bảo mật PDFBox và hạ tầng thông báo đẩy. | **100%** |
| 2 | **Nguyễn Nhật Thiên** | 23110153 | - Phát triển native WebSocket STOMP client phía Frontend (`realtime-notification-client.ts`) với cơ chế Heartbeat ping/pong và Exponential Backoff Reconnect.<br>- Xây dựng hook `useRealtimeNotifications.ts` và component `StudentAnnouncementBell` với badge "Trực tiếp".<br>- Xây dựng giao diện Hỏi & Đáp bài học đa tầng (`learning-lesson-discussions.tsx`) tích hợp cơ chế nhảy mốc thời gian video bài học (Video Timestamp Jump).<br>- Hoàn thiện Cổng xác thực chứng chỉ điện tử công khai (`verify-certificate-page.tsx`) tối ưu SSR 0ms loading, Web Share API và CSS in khổ A4. | Hoàn thiện 100% giao diện học tập, chuông thông báo trực tiếp và trang xác thực văn bằng. | **100%** |
| 3 | **Trương Công Anh** | 23110075 | - Thiết kế CSDL và viết Flyway Migration `V32__lesson_discussions_and_comments.sql` và `V33__realtime_notifications.sql`.<br>- Cấu hình ma trận phân quyền RBAC cho các chức năng thông báo đẩy và điều hành thảo luận.<br>- Xây dựng trọn bộ kiểm thử tự động frontend: Thảo luận bài học (4/4 passed), Chuông WebSocket (3/3 passed), Xác thực chứng chỉ (3/3 passed).<br>- Viết unit test cho `CertificatePdfGeneratorTest.java` trên Backend.<br>- Xây dựng tài liệu kỹ thuật, kịch bản kiểm thử tích hợp và hướng dẫn nghiệm thu 3 kịch bản thực tế. | Hoàn thành 100% migration CSDL, bộ kiểm thử tự động và tài liệu nghiệm thu. | **100%** |

---

## LỜI CẢM ƠN

Để hoàn thành bài báo cáo tiến độ Tiểu luận Chuyên ngành Tuần 9 này, nhóm chúng em xin bày tỏ lòng biết ơn sâu sắc và chân thành nhất đến quý thầy cô trường **Đại học Sư phạm Kỹ thuật TP. Hồ Chí Minh**, đặc biệt là các thầy cô tại **Khoa Đào tạo Chất lượng cao** và **Khoa Công nghệ Thông tin**, những người đã luôn tận tâm truyền đạt những nền tảng tri thức quý báu và rèn luyện tư duy khoa học cho chúng em trong suốt quá trình học tập.

Đặc biệt, nhóm chúng em xin gửi lời cảm ơn chân thành và sâu sắc nhất đến thầy **PGS.TS. Hoàng Văn Dũng**, người đã luôn định hướng phương pháp nghiên cứu, tận tình hướng dẫn, góp ý chuyên môn sâu sắc và tạo mọi điều kiện thuận lợi nhất để nhóm có thể tiếp cận, phân tích và triển khai đề tài *“Thiết kế và xây dựng hệ thống quản lý học tập trực tuyến EduAlto”* một cách bài bản, đúng quy chuẩn học thuật và bám sát thực tiễn công nghệ hiện đại.

Mặc dù nhóm đã nỗ lực hết mình với tinh thần nghiêm túc và cầu thị, song do khối lượng nghiệp vụ lớn và thời gian nghiên cứu thực tế có hạn, bài báo cáo khó tránh khỏi những thiếu sót nhất định. Nhóm chúng em rất mong nhận được những lời nhận xét, góp ý và chỉ dẫn quý báu từ thầy để đề tài ngày càng hoàn thiện tốt hơn.

*Kính chúc thầy luôn dồi dào sức khỏe, hạnh phúc và gặt hái được nhiều thành công hơn nữa trong sự nghiệp giáo dục cao quý!*

---

# I. THIẾT KẾ GIẢI PHÁP HẠ TẦNG HỆ THỐNG

## 1.1. Sơ đồ kiến trúc triển khai tổng thể EduAlto
Hệ thống EduAlto được thiết kế và triển khai trên nền tảng đám mây hiện đại, kết hợp hài hòa giữa các dịch vụ hạ tầng chuyên biệt nhằm tối ưu hóa chi phí, tăng tính linh hoạt và bảo vệ dữ liệu tối đa:
- **AWS Lightsail**: Máy chủ ứng dụng chạy Ubuntu Linux, quản lý container backend và proxy nội bộ.
- **Vercel Edge Network**: Nền tảng phân phối giao diện người dùng Next.js 16 trên mạng lưới CDN toàn cầu.
- **Cloudflare R2**: Hạ tầng lưu trữ đối tượng tương thích S3 API, tối ưu băng thông video bài giảng và tài liệu học tập.
- **Amazon RDS PostgreSQL 16**: CSDL quan hệ chính nằm độc lập trong Private Subnet VPC, đảm bảo nguyên tắc Zero Public DB Exposure.
- **Redis 7 (Private Network)**: Hệ thống bộ nhớ đệm phân tán và quản lý phiên đăng nhập tốc độ cao.
- **Amazon CloudWatch & SNS**: Giám sát nhật ký, độ trễ, lưu lượng và kích hoạt cảnh báo tự động khi có sự cố.

## 1.2. Chi tiết các phân tầng trong giải pháp Decoupled Multi-tier
1. **Tầng Trình duyệt & Frontend (Client Tier)**: Next.js 16 (App Router), React, Tailwind CSS, Vercel CDN Edge. Phục vụ nội dung tĩnh và render tại Edge, giao tiếp với backend qua HTTPS TLS có bảo mật CORS.
2. **Tầng API Gateway & Reverse Proxy**: Caddy Web Server, AWS Lightsail Firewall. Cổng tiếp nhận lưu lượng duy nhất của backend, tự động quản lý chứng chỉ SSL Let's Encrypt, chỉ mở cổng 443 và 80, chuyển tiếp nội bộ đến container API.
3. **Tầng Dịch vụ Backend (Application Tier)**: Spring Boot 3, Java 25 LTS, kiến trúc Modular Monolith tổ chức phân rã theo miền nghiệp vụ: `auth`, `user`, `course`, `learning`, `quiz`, `certificate`, `discussion`, `notification`, `admin`, `storage`.
4. **Tầng Bộ nhớ đệm & Phiên (Cache Tier)**: Redis 7 nội bộ (Port 6379), lưu trữ cache danh mục khóa học, ma trận phân quyền động RBAC và xác thực nhanh Refresh Token trước khi truy vấn CSDL.
5. **Tầng Cơ sở dữ liệu (Persistence Tier)**: Amazon RDS PostgreSQL 16 (Private VPC Subnet). Nằm cô lập hoàn toàn trong mạng riêng tư, chỉ chấp nhận kết nối nội bộ có mã hóa TLS từ máy chủ backend.
6. **Tầng Lưu trữ Tệp lớn (Object Storage Tier)**: Cloudflare R2 với cơ chế Presigned URL giúp client tải lên và phát video trực tiếp, loại bỏ hoàn toàn hiện tượng nghẽn băng thông server.

## 1.3. Các luồng dữ liệu và mạng cốt lõi
- **Luồng 1 (Web Traffic)**: Người dùng tải giao diện Next.js qua Vercel Edge CDN bằng giao thức HTTPS.
- **Luồng 2 (API Requests)**: Trình duyệt gửi yêu cầu REST API kèm Access Token Bearer hoặc Refresh Token HttpOnly Cookie đến IP tĩnh của Caddy Reverse Proxy tại cổng 443.
- **Luồng 3 (Internal Proxy)**: Caddy giải mã SSL/TLS và chuyển tiếp yêu cầu HTTP nội bộ (cổng 8080) đến container Spring Boot API. Cổng 8080 và 6379 hoàn toàn đóng đối với mạng Internet bên ngoài.
- **Luồng 4 (Database Connection)**: Backend kết nối an toàn TLS qua cổng 5432 đến RDS Primary Endpoint qua VPC Peering nội bộ.
- **Luồng 5 (Distributed Caching)**: Backend truy xuất cache (RBAC, khóa học, phiên làm việc) qua Redis cổng nội bộ 6379.
- **Luồng 6 & 7 (Presigned URL Streaming)**: Backend sinh URL ký trước có thời hạn bảo mật nghiêm ngặt từ Cloudflare R2; trình duyệt phát video trực tiếp từ R2 mà không đi qua máy chủ backend.
- **Luồng 8 & 9 (CI/CD Automated Deployment)**: GitHub Actions runner tự động kiểm tra lint, format, typecheck, test và deploy container mới mà không gây gián đoạn dịch vụ (Zero-downtime).
- **Luồng 10, 11 & 12 (Monitoring & Alerting)**: Application logs được đẩy về CloudWatch Logs. Chỉ số CPU, RAM, độ trễ API được theo dõi liên tục; khi vượt ngưỡng an toàn (CPU > 85% hoặc lỗi 5xx), CloudWatch kích hoạt SNS gửi email cảnh báo khẩn cấp tới đội ngũ vận hành.

---

# II. CÔNG VIỆC TRIỂN KHAI VÀ HOÀN THIỆN TRONG TUẦN 9

Trong Tuần 9 (31/10/2026 – 06/11/2026), nhóm đã tập trung triển khai, hoàn thiện triệt để và kiểm thử tự động toàn diện **3 phân hệ nghiệp vụ trọng tâm**, giải quyết toàn bộ các yêu cầu khắt khe về tính năng, bảo mật và trải nghiệm tương tác thời gian thực:

---

## 2.1. Phân hệ Cấp & Xác thực Chứng chỉ điện tử nâng cao (Advanced E-Certificate & Instant QR Verification - EDU-47, EDU-89, EDU-90)

### 2.1.1. Cơ chế tự động cấp và Chống Race Condition
- Khi học viên hoàn thành 100% khối lượng bài học bắt buộc trong khóa học, hệ thống tự động kích hoạt tiến trình cấp chứng nhận.
- **Khóa bi quan (Pessimistic Locking)**: Sử dụng truy vấn `SELECT ... FOR UPDATE` trong giao dịch database nhằm khóa bản ghi ghi danh của học viên trong suốt quá trình kiểm tra và tạo chứng chỉ. Cơ chế này loại bỏ hoàn toàn nguy cơ Race Condition hoặc cấp phát bản ghi trùng lặp khi người học bấm nút hoàn thành nhiều lần đồng thời.
- Mỗi chứng chỉ được gán một mã định danh duy nhất theo định dạng chuẩn: `EA-<HEX_MÃ_DUY_NHẤT>` (ví dụ: `EA-9169D755D4774C99A56B5FC9CFFDD2EC`).

### 2.1.2. Công nghệ sinh PDF chuẩn mực với Tem bảo mật đa tầng (CertificatePdfGenerator)
Tích hợp thư viện **Apache PDFBox 3.0.8** để kết xuất tài liệu PDF khổ ngang **A4 Landscape** (841.89 x 595.28 points) với độ hoàn thiện mỹ thuật cao:
1. **Quản trị phông chữ tiếng Việt chuẩn xác**: Nhúng trực tiếp font Unicode TrueType (`Roboto-Regular.ttf` và `Roboto-Bold.ttf`), bảo đảm hiển thị sắc nét 100% các dấu thanh tiếng Việt mà không xảy ra hiện tượng vỡ font hoặc tràn lề trên mọi hệ điều hành.
2. **Hoa văn bảo mật sóng âm Guilloche (Guilloche Security Wave Lines)**: Sử dụng thuật toán vẽ vector các đường sóng hình sin đan xen tinh tế tại bốn góc và đường viền nền, tạo hiệu ứng chống làm giả thường thấy trên các văn bằng, trái phiếu quốc tế.
3. **Hình mờ bảo mật trung tâm (Security Watermark)**: Khắc chìm dòng chữ thương hiệu *"EDUALTO CERTIFICATE OF COMPLETION"* với độ nghiêng 30 độ và độ trong suốt tinh tế tại trung tâm văn bằng.
4. **Tem bảo mật vector đa tầng (Multi-layer Vector Security Seal)**:
   - Vành hoa cúc 36 cánh răng cưa cách điệu (Scalloped Petals) mạ vàng kim sang trọng (`#D4AF37`).
   - Dải ruy băng đôi đối xứng uốn lượn bên dưới đáy tem.
   - Vòng tròn viền men ngọc thương hiệu `#20B486` kết hợp chùm 5 ngôi sao vàng năm cánh biểu trưng chất lượng xuất sắc.
   - Dải chữ viền tròn: *"EDUALTO OFFICIAL CERTIFICATE • EXCELLENCE IN LEARNING"*.
5. **Viền vi chữ bảo mật (Microtext Border)**:
   - Dải vi chữ siêu nhỏ kích thước 4.2pt chạy dọc theo đường viền bao quanh toàn bộ văn bằng: `"EDUALTO SECURE CERTIFICATE • VERIFIED ON-CHAIN & IN-DATABASE"`.
   - Vi chữ này rõ nét khi xem kỹ thuật số ở mức thu phóng cao, nhưng sẽ tự động bị nhòe mờ khi scan hoặc photocopy tài liệu giấy, ngăn chặn sao chép trái phép.
6. **Mã băm toàn vẹn SHA-256 (SEC-HASH)**:
   - Hệ thống tự động trích xuất chuỗi định danh gồm `Mã chứng chỉ + ID học viên + Tên học viên + ID khóa học + Ngày cấp`, băm qua thuật toán SHA-256 để tạo mã kiểm tra toàn vẹn dữ liệu.
   - 16 ký tự đầu của chuỗi băm được in trực tiếp lên văn bằng tại mục `SEC-HASH: [MÃ_BĂM]`.
7. **Mã ma trận điểm QR Code động (ZXing 3.5.3)**:
   - Tự động sinh mã ma trận vuông 300x300 pixel, nhúng trực tiếp vào góc dưới bên phải chứng chỉ.
   - Quét mã QR sẽ đưa người xem trực tiếp tới trang xác minh công khai trực tuyến.

### 2.1.3. Cổng xác thực văn bằng trực tuyến công khai (Public Verification Portal)
- Đường dẫn xác minh: `/certificates/verify/{certificateNumber}`.
- **Server-Side Pre-fetch (SSR)**: Tối ưu tải trang hiển thị ngay lập tức (0ms loading), phục vụ việc tra cứu nhanh của nhà tuyển dụng hoặc đối tác trên thiết bị di động mà không cần đăng nhập tài khoản.
- **Giao diện trực quan**:
  - Huy hiệu xanh nổi bật: *"Chứng nhận hợp lệ & Đã xác thực"*.
  - 4 khối thẻ thông số chi tiết: Tên học viên được vinh danh, Ngày hoàn thành, Mã xác thực điện tử và Giảng viên hướng dẫn khóa học.
  - Các công cụ tương tác: Tải file PDF chứng chỉ gốc bảo mật cao, sao chép liên kết chứng nhận, chia sẻ tức thì qua Web Share API lên mạng xã hội (Facebook, LinkedIn, Zalo).
- **Hỗ trợ quét QR trên thiết bị di động mạng nội bộ (LAN)**: Tự động phát hiện IP máy chủ mạng LAN (`http://192.168.1.35:3000`) thay vì `localhost`, cho phép camera điện thoại hoặc ứng dụng Zalo quét mã QR trên màn hình máy tính mở được ngay trang xác thực trên điện thoại.

---

## 2.2. Phân hệ Thảo luận & Hỏi đáp bài học tương tác cao (Lesson Q&A Discussions - EDU-15, EDU-49)

### 2.2.1. Tính năng neo mốc thời gian video bài học (Video Timestamp Anchor)
- Trong quá trình xem video bài giảng, nếu học viên gặp khái niệm khó hiểu hoặc thắc mắc tại một phân đoạn cụ thể, học viên chỉ cần bấm nút *"Đính kèm mốc video hiện tại"*.
- Hệ thống tự động ghi nhận thời điểm của trình phát video (ví dụ: `01:45` hoặc `02:05`).
- Khi câu hỏi được đăng lên, mốc thời gian hiển thị dưới dạng huy hiệu nhấp chuột được (Clickable Timestamp Pill).
- **Trải nghiệm nhảy phát lại (Video Player Jump)**: Khi học viên khác hoặc giảng viên bấm vào mốc thời gian trong câu hỏi hoặc bình luận, trình phát video lập tức tua phát lại đúng giây tương ứng (ví dụ: giây 105 cho `01:45`), giúp người xem nắm bắt ngay ngữ cảnh học tập mà không cần tự tìm kiếm thanh trượt.

### 2.2.2. Tương tác đa tầng & Bình luận lồng nhau (Threaded Discussions)
- **Cấu trúc phân cấp**: Hỗ trợ một chủ đề thảo luận chính (Discussion Thread) và không giới hạn số lượng câu trả lời phản hồi lồng nhau (`DiscussionComment` liên kết qua `parent_comment_id`).
- **Huy hiệu Giảng viên phụ trách (`isCourseInstructor`)**: Hệ thống tự động đối chiếu ID người bình luận với Giảng viên được phân công giảng dạy khóa học đó. Khi Giảng viên trả lời, bình luận được tự động gắn huy hiệu màu xanh lục nổi bật *"Giảng viên"*, giúp học viên phân biệt câu trả lời chính thống từ người hướng dẫn với các trao đổi giữa các bạn học.
- **Bộ lọc & Tìm kiếm bài học thông minh**:
  - Bộ lọc *"Chỉ hiển thị câu hỏi có mốc video"*: Giúp cô đọng các thắc mắc liên quan trực tiếp đến bài giảng.
  - Tìm kiếm toàn văn (Full-text Search): Lọc nhanh nội dung câu hỏi theo từ khóa.
  - Sắp xếp: Cho phép chuyển đổi linh hoạt giữa "Mới nhất", "Cũ nhất" hoặc "Nhiều bình luận nhất".
- **Kiểm duyệt & Phân quyền RBAC**:
  - Học viên có toàn quyền chỉnh sửa và xóa câu hỏi, bình luận do chính mình đăng tải.
  - Giảng viên phụ trách khóa học và Quản trị viên hệ thống có thẩm quyền điều hành cao cấp: Ghim câu hỏi quan trọng lên đầu danh mục, đóng chủ đề thảo luận khi đã giải quyết xong, hoặc xóa bình luận không phù hợp.

### 2.2.3. Thiết kế Cơ sở dữ liệu Thảo luận (Flyway Migration V32)
- Bảng `discussions`:
  - `id` (UUID, Primary Key)
  - `lesson_id` (UUID, FK -> `lessons`, Index)
  - `user_id` (UUID, FK -> `users`, Index)
  - `title` (VARCHAR 255)
  - `content` (TEXT)
  - `video_timestamp_seconds` (INTEGER, Nullable)
  - `status` (VARCHAR 32, Default 'OPEN')
  - `created_at`, `updated_at`, `deleted_at` (TIMESTAMP WITH TIME ZONE)
- Bảng `discussion_comments`:
  - `id` (UUID, Primary Key)
  - `discussion_id` (UUID, FK -> `discussions`, Index)
  - `user_id` (UUID, FK -> `users`, Index)
  - `parent_comment_id` (UUID, FK -> `discussion_comments`, Nullable)
  - `content` (TEXT)
  - `video_timestamp_seconds` (INTEGER, Nullable)
  - `created_at`, `updated_at`, `deleted_at` (TIMESTAMP WITH TIME ZONE)

---

## 2.3. Phân hệ WebSocket gửi thông báo đẩy thời gian thực (Real-time Push Notifications)

### 2.3.1. Kiến trúc Hạ tầng WebSocket STOMP
Nhằm mang đến trải nghiệm tương tác trực tiếp, loại bỏ hoàn toàn nhu cầu người dùng phải tự tải lại trang để biết có phản hồi mới, nhóm đã thiết kế hạ tầng thông báo đẩy thời gian thực dựa trên chuẩn giao thức STOMP:
- **Endpoint kết nối**: `/ws`, hỗ trợ giao thức thuần WebSocket cùng cơ chế SockJS dự phòng cho môi trường mạng hạn chế.
- **Xác thực bảo mật đa tầng (Handshake & Connect Auth)**:
  - Tầng 1 (HTTP Upgrade Handshake): Hỗ trợ truyền JWT Token qua URL query parameter `?token=<access_token>` trong `JwtAuthenticationFilter`, cho phép thiết lập kết nối an toàn ngay từ bước bắt tay giao thức.
  - Tầng 2 (STOMP Connect Frame): Bổ sung `ChannelInterceptor` trích xuất header `Authorization: Bearer <token>`, giải mã thông tin tài khoản và nạp vào đối tượng `Principal` của Spring Security context.
- **Cấu hình Tiền tố Kênh (Broker Prefix & User Queue)**:
  - Application Prefix: `/app` (nhận lệnh từ client).
  - Simple Broker Prefix: `/topic` (kênh chung), `/queue` (kênh riêng).
  - User Destination Prefix: `/user` (định tuyến đích danh người nhận).
  - Kênh thông báo cá nhân: Client đăng ký nhận tin tại destination `/user/queue/notifications`. Khi backend gọi `simpMessagingTemplate.convertAndSendToUser(userId, "/queue/notifications", payload)`, khung làm việc sẽ tự động chuyển đổi thành kênh đích danh duy nhất chỉ người dùng đó nhận được.

### 2.3.2. Kích hoạt luồng thông báo tự động theo sự kiện nghiệp vụ
Hệ thống tự động lắng nghe các sự kiện nghiệp vụ trong vòng đời ứng dụng và phát sinh thông báo tức thời:
1. **Sự kiện Giảng viên trả lời câu hỏi bài học**:
   - Khi Giảng viên (hoặc bạn học khác) gửi phản hồi trong chủ đề thảo luận, `DiscussionService` tự động kiểm tra người gửi.
   - Nếu người gửi khác với tác giả câu hỏi, hệ thống tự động lưu bản ghi thông báo mới loại `DISCUSSION_REPLY` vào CSDL và đẩy tin nhắn STOMP tức thời đến tác giả câu hỏi.
   - Nội dung thông báo hiển thị tên người trả lời, tiêu đề câu hỏi, kèm deep-link dẫn trực tiếp tới đúng bài học có câu hỏi đó.
2. **Sự kiện Học viên mới đăng ký khóa học**:
   - Khi học viên ghi danh thành công một khóa học, `EnrollmentService` tự động phát sinh bản ghi loại `NEW_ENROLLMENT`.
   - Hệ thống đẩy thông báo tức thì đến tài khoản của Giảng viên phụ trách khóa học: *"Học viên [Tên] vừa đăng ký khóa học [Tên khóa học]"*.

### 2.3.3. Bền vững hóa dữ liệu & Phân quyền RBAC (Migration V33)
- Bảng `notifications`:
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, FK -> `users`, Index)
  - `type` (VARCHAR 64: `DISCUSSION_REPLY`, `NEW_ENROLLMENT`, `COURSE_ANNOUNCEMENT`...)
  - `title` (VARCHAR 255)
  - `message` (TEXT)
  - `action_url` (VARCHAR 500)
  - `read_at` (TIMESTAMP WITH TIME ZONE, Nullable)
  - `created_at` (TIMESTAMP WITH TIME ZONE)
- **Cấu hình phân quyền RBAC**: Bổ sung các quyền tường minh vào danh mục:
  - `VIEW_REALTIME_NOTIFICATIONS`: Cấp cho `ROLE_STUDENT`, `ROLE_INSTRUCTOR`, `ROLE_ADMIN`.
  - `MARK_REALTIME_NOTIFICATION_READ`: Cấp cho `ROLE_STUDENT`, `ROLE_INSTRUCTOR`, `ROLE_ADMIN`.
  - `MARK_ALL_REALTIME_NOTIFICATIONS_READ`: Cấp cho `ROLE_STUDENT`, `ROLE_INSTRUCTOR`, `ROLE_ADMIN`.

### 2.3.4. Phía Frontend Client & Chuông thông báo trực tiếp
- **STOMP Client thuần tự viết (`realtime-notification-client.ts`)**:
  - Nhóm quyết định xây dựng STOMP Client gọn nhẹ không phụ thuộc thư viện nặng bên ngoài, kiểm soát hoàn toàn luồng gửi nhận frame `CONNECT`, `CONNECTED`, `SUBSCRIBE`, `MESSAGE`, `PING`, `PONG`.
  - **Heartbeat & Giữ kết nối**: Tự động phát nhịp tim 10 giây/lần.
  - **Tự động kết nối lại (Exponential Backoff Reconnect)**: Khi phát hiện đứt kết nối mạng, client tự động thử kết nối lại theo chu kỳ lũy thừa (1s, 2s, 4s, 8s... tối đa 30s) mà không gây quá tải cho máy chủ.
- **Hook React `useRealtimeNotifications.ts`**:
  - Quản lý trạng thái kết nối socket (`isConnected`), danh sách thông báo mới nhận, và bộ đếm số lượng chưa đọc (`unreadCount`).
  - Hỗ trợ hàm `markAsRead(id)` và `markAllAsRead()`, đồng bộ tức thì giữa giao diện và cơ sở dữ liệu.
- **Component Chuông thông báo `StudentAnnouncementBell`**:
  - Hiển thị trên thanh Header chính của ứng dụng cho cả Học viên và Giảng viên.
  - Đi kèm huy hiệu tròn hiển thị số lượng chưa xem.
  - Khi WebSocket đang mở, xuất hiện badge màu xanh lục **"Trực tiếp"** với chấm tròn nhấp nháy (Ping animation), khẳng định hệ thống đang nhận dữ liệu tức thì.
  - Khung danh sách popup trình bày các thẻ thông báo chuẩn UX: Icon nhận diện màu sắc theo loại sự kiện (Xanh ngọc cho phản hồi hỏi đáp, Xanh dương cho học viên mới ghi danh), hiển thị thời gian tương đối thân thiện (*"Vừa xong"*, *"5 phút trước"*), và nút bấm *"Đánh dấu tất cả đã đọc"*.

---

## 2.4. Danh mục chi tiết các tệp tin đã triển khai trong tuần 9

### A. Phía Backend (Java Spring Boot & PostgreSQL Migrations)
1. `backend/src/main/resources/db/migration/V32__lesson_discussions_and_comments.sql`: Khởi tạo bảng CSDL `discussions` và `discussion_comments`, thiết lập khóa ngoại và chỉ mục truy vấn tối ưu.
2. `backend/src/main/resources/db/migration/V33__realtime_notifications.sql`: Khởi tạo bảng CSDL `notifications`, bổ sung quyền hạn RBAC và liên kết quyền hạn cho các vai trò hệ thống.
3. `backend/src/main/java/com/edualto/common/config/WebSocketConfig.java`: Cấu hình STOMP Message Broker, kích hoạt endpoint `/ws`, hỗ trợ SockJS fallback và bổ sung ChannelInterceptor xác thực JWT token.
4. `backend/src/main/java/com/edualto/common/security/AuthenticatedUser.java`: Bổ sung triển khai giao diện chuẩn `java.security.Principal`, trả về User ID phục vụ cơ chế định tuyến thông báo đích danh của Spring Security.
5. `backend/src/main/java/com/edualto/common/security/JwtAuthenticationFilter.java`: Bổ sung cơ chế trích xuất JWT Token từ query param `?token=` trong HTTP upgrade handshake của WebSocket.
6. `backend/src/main/java/com/edualto/common/security/SecurityConfig.java`: Cho phép bảo mật endpoint `/ws` và cấu hình CORS mở rộng cho mạng nội bộ LAN.
7. `backend/src/main/java/com/edualto/certificate/service/CertificatePdfGenerator.java`: Nâng cấp toàn diện thuật toán kết xuất PDF: Nhúng phông Roboto tiếng Việt, vẽ hoa văn bảo mật Guilloche, tem hoa cúc 36 cánh vector mạ vàng, dải vi chữ bảo mật 4.2pt, mã băm SHA-256 và mã QR Code.
8. `backend/src/main/java/com/edualto/notification/domain/Notification.java`: Entity ánh xạ bảng thông báo người dùng.
9. `backend/src/main/java/com/edualto/notification/domain/NotificationType.java`: Enum phân loại thông báo (`DISCUSSION_REPLY`, `NEW_ENROLLMENT`...).
10. `backend/src/main/java/com/edualto/notification/repository/NotificationRepository.java`: Repository truy vấn danh sách thông báo và đếm số lượng thông báo chưa đọc.
11. `backend/src/main/java/com/edualto/notification/service/RealtimeNotificationService.java`: Dịch vụ gửi thông báo đẩy STOMP và lưu trữ lịch sử vào CSDL.
12. `backend/src/main/java/com/edualto/notification/controller/RealtimeNotificationController.java`: Cung cấp REST API `/api/v1/me/realtime-notifications` tra cứu lịch sử và đánh dấu đã đọc.
13. `backend/src/main/java/com/edualto/discussion/domain/Discussion.java` & `DiscussionComment.java`: Entity mô hình hóa câu hỏi bài học và các bình luận lồng nhau.
14. `backend/src/main/java/com/edualto/discussion/service/DiscussionService.java`: Xử lý toàn bộ logic hỏi đáp, kiểm tra thẩm quyền, neo mốc video và kích hoạt thông báo cho người tham gia.
15. `backend/src/main/java/com/edualto/discussion/controller/DiscussionController.java`: Cung cấp REST API đầy đủ cho phân hệ hỏi đáp bài học.
16. `backend/src/main/java/com/edualto/enrollment/service/EnrollmentService.java`: Tích hợp phát sinh thông báo đẩy tới giảng viên khi có học viên mới ghi danh.
17. `backend/src/test/java/com/edualto/certificate/service/CertificatePdfGeneratorTest.java`: Bộ kiểm thử tự động kiểm tra việc sinh PDF, tính hợp lệ của mã băm SHA-256 và tem bảo mật.

### B. Phía Frontend (Next.js 16, TypeScript, Tailwind CSS)
1. `frontend/src/lib/realtime-notification-client.ts`: Module STOMP WebSocket Client thuần, quản lý vòng đời socket, heartbeat và kết nối lại lũy thừa.
2. `frontend/src/lib/discussion-client.ts`: API client cho toàn bộ tính năng thảo luận và bình luận bài học.
3. `frontend/src/features/notification/use-realtime-notifications.ts`: Hook React tùy biến quản lý danh sách thông báo, số lượng unread và trạng thái realtime socket.
4. `frontend/src/features/notification/realtime-notification-row.tsx`: Component hiển thị một mục thông báo đẩy chuẩn UX với icon, thời gian tương đối và chấm xanh chưa đọc.
5. `frontend/src/features/notification/student-announcement-bell.tsx`: Nâng cấp chuông thông báo, tích hợp realtime socket, badge "Trực tiếp", hỗ trợ cho cả Học viên & Giảng viên.
6. `frontend/src/features/learning/learning-lesson-discussions.tsx`: Giao diện thảo luận hỏi đáp chuyên nghiệp, hỗ trợ gắn mốc thời gian video, tua video khi bấm timestamp, bình luận phân cấp và hiển thị huy hiệu Giảng viên.
7. `frontend/src/features/learning/learning-lesson-page.tsx`: Tích hợp tab Hỏi & Đáp trực tiếp vào không gian phòng học trực tuyến.
8. `frontend/src/features/certificate/verify-certificate-page.tsx`: Giao diện Cổng xác thực chứng chỉ công khai, tối ưu hiển thị tức thì, hỗ trợ tải PDF và chia sẻ đa nền tảng.
9. `frontend/src/features/learning/learning-lesson-discussions.test.tsx`: Bộ kiểm thử tự động 4 kịch bản giao diện hỏi đáp bài học.
10. `frontend/src/features/notification/student-announcement-bell.test.tsx`: Bộ kiểm thử tự động 3 kịch bản chuông thông báo thời gian thực.
11. `frontend/src/features/certificate/verify-certificate-page.test.tsx`: Bộ kiểm thử tự động 3 kịch bản trang xác thực chứng chỉ trực tuyến.

---

# III. KIỂM THỬ VÀ ĐẢM BẢO CHẤT LƯỢNG (QA & QUALITY GATES)

Nhằm đảm bảo sản phẩm đạt chất lượng công nghiệp cao nhất trước khi báo cáo nghiệm thu, nhóm duy trì việc thực thi nghiêm ngặt **Quy trình kiểm tra chất lượng 6 bước tự động**:

## 3.1. Kết quả thực thi bộ công cụ kiểm tra tự động

| STT | Cấp độ kiểm tra | Công cụ / Lệnh thực hiện | Yêu cầu chất lượng | Kết quả thực tế | Đánh giá |
|---|---|---|---|---|---|
| **1** | **Fast Lint** (Kiểm tra lint siêu tốc) | Oxlint (`pnpm frontend:lint:fast`) | 0 lỗi, 0 cảnh báo | **0 lỗi, 0 cảnh báo** (quét trên 244 tệp) | **ĐẠT (100%)** |
| **2** | **Detailed Lint** (Kiểm tra quy chuẩn cú pháp) | ESLint 9 (`pnpm frontend:lint`) | Không vi phạm style guide | **0 lỗi, 0 cảnh báo** | **ĐẠT (100%)** |
| **3** | **Format Check** (Kiểm tra định dạng code) | Oxfmt (`pnpm frontend:fmt:check`) | 100% tệp đồng bộ format | **100% đạt chuẩn** (quét trên 249 tệp) | **ĐẠT (100%)** |
| **4** | **Type Check** (Kiểm tra kiểu dữ liệu tĩnh) | TypeScript (`pnpm frontend:typecheck`) | Tuyệt đối không lỗi type | **0 lỗi biên dịch kiểu dữ liệu** | **ĐẠT (100%)** |
| **5** | **Frontend Unit & Component Tests** | Vitest (`pnpm --dir frontend test`) | 100% bài test vượt qua | **31/31 suites passed (122/122 tests passed)** | **ĐẠT (100%)** |
| **6** | **Backend Unit & Integration Tests** | Maven Wrapper (`./backend/mvnw test`) | Build Success, passed all tests | **BUILD SUCCESS (15/15 test classes passed)** | **ĐẠT (100%)** |

## 3.2. Chi tiết các bộ kiểm thử chuyên biệt được bổ sung cho Tuần 9

1. **Bộ kiểm thử Thảo luận & Hỏi đáp bài học (`learning-lesson-discussions.test.tsx`)**:
   - `it('renders discussions list with time and replies count')`: Kiểm tra hiển thị danh sách câu hỏi, số lượng phản hồi và thời gian đăng.
   - `it('submits a new question with video timestamp')`: Kiểm tra form tạo câu hỏi mới có đính kèm mốc thời gian video bài học.
   - `it('triggers video seek when clicking timestamp badge')`: Kiểm tra sự kiện tua video bài giảng đến đúng mốc giây tương ứng khi nhấp vào huy hiệu thời gian.
   - `it('submits a reply comment to an existing question')`: Kiểm tra việc gửi bình luận phản hồi cho câu hỏi và cập nhật danh sách hiển thị.
   - **Kết quả: 4/4 passed (100%)**.

2. **Bộ kiểm thử Chuông thông báo WebSocket (`student-announcement-bell.test.tsx`)**:
   - `it('displays unread count badge accurately')`: Kiểm tra hiển thị chính xác số lượng thông báo chưa đọc trên chuông.
   - `it('renders live status badge and notifications list in dialog')`: Kiểm tra mở popup hiển thị huy hiệu "Trực tiếp" khi socket kết nối thành công cùng danh sách thông báo.
   - `it('marks all notifications as read when clicking action button')`: Kiểm tra hành động đánh dấu tất cả đã đọc, xóa chấm xanh và cập nhật số lượng về 0.
   - **Kết quả: 3/3 passed (100%)**.

3. **Bộ kiểm thử Cổng xác thực chứng chỉ (`verify-certificate-page.test.tsx`)**:
   - `it('renders certificate details correctly for valid code')`: Kiểm tra hiển thị đầy đủ tên học viên, ngày cấp, mã chứng chỉ và giảng viên.
   - `it('displays valid badge and download certificate button')`: Kiểm tra huy hiệu xanh "Chứng chỉ hợp lệ" và nút tải file PDF bảo mật.
   - `it('handles invalid or non-existent certificate code gracefully')`: Kiểm tra trạng thái thông báo rõ ràng khi mã chứng chỉ không tồn tại hoặc bị sai lệch.
   - **Kết quả: 3/3 passed (100%)**.

4. **Bộ kiểm thử Sinh PDF chứng chỉ bảo mật (`CertificatePdfGeneratorTest.java`)**:
   - Kiểm tra kết xuất file PDF hợp lệ với Apache PDFBox, nhúng đầy đủ các thành phần vector, viền vi chữ và mã băm SHA-256 toàn vẹn dữ liệu.
   - **Kết quả: Passed (100%)**.

---

# IV. KỊCH BẢN VÀ HƯỚNG DẪN NGHIỆM THU TÍNH NĂNG THỰC TẾ

Để phục vụ công tác nghiệm thu trực quan, nhóm đã chuẩn bị **4 kịch bản kiểm thử thực tế từng bước**:

### Kịch bản 1: Giảng viên phản hồi thắc mắc bài học của học viên (WebSocket Push Real-time)
1. **Bước 1 (Trình duyệt A - Tài khoản Học viên)**: Học viên truy cập bài học bất kỳ, chuyển sang tab **Hỏi đáp**, bấm nút lấy mốc video hiện tại (ví dụ: `01:45`) và đăng câu hỏi: *"Khái niệm này áp dụng trong thực tế như thế nào?"*.
2. **Bước 2 (Trình duyệt B - Tài khoản Giảng viên phụ trách)**: Giảng viên mở giao diện khóa học, mở câu hỏi của học viên và nhập nội dung giải đáp chuyên môn.
3. **Bước 3 (Quan sát Trình duyệt A của Học viên)**:
   - **Không cần tải lại trang (No page reload)**: Chuông thông báo trên thanh Header lập tức xuất hiện chấm đỏ kèm số lượng chưa đọc.
   - Bấm vào chuông: Hiển thị badge màu xanh **"Trực tiếp"** với thông báo mới: *"Giảng viên đã giải đáp câu hỏi của bạn: [Tên câu hỏi]"*.
   - Nhấp vào thông báo: Ứng dụng tự động điều hướng đến đúng bài học, chuyển sang tab Hỏi đáp và tự động đánh dấu đã đọc thông báo.

### Kịch bản 2: Học viên mới ghi danh khóa học (WebSocket Push tới Giảng viên)
1. **Bước 1 (Trình duyệt B - Tài khoản Giảng viên)**: Giảng viên đang làm việc trên trang quản trị hoặc xem nội dung bất kỳ trên website.
2. **Bước 2 (Trình duyệt A - Tài khoản Học viên)**: Học viên tiến hành đăng ký ghi danh một khóa học do Giảng viên đó phụ trách.
3. **Bước 3 (Quan sát Trình duyệt B của Giảng viên)**:
   - Ngay tại thời điểm giao dịch ghi danh hoàn tất, chuông thông báo của Giảng viên lập tức nhận thông báo đẩy thời gian thực qua kênh `/user/queue/notifications`.
   - Nội dung thông báo hiển thị: *"Học viên mới đăng ký khóa học: Học viên [Tên] vừa đăng ký khóa học [Tên khóa học]"*.

### Kịch bản 3: Hỏi đáp gắn mốc thời gian video và trải nghiệm nhảy phát lại (Video Timestamp Jump)
1. **Bước 1**: Trong màn hình xem video bài học, kéo thanh trượt video đến thời điểm bất kỳ (ví dụ: `02:15`).
2. **Bước 2**: Nhấp vào nút *"Đính kèm mốc video hiện tại"*, nhập nội dung câu hỏi và gửi lên hệ thống.
3. **Bước 3**: Câu hỏi được tạo thành công với huy hiệu nổi bật `02:15`.
4. **Bước 4**: Cho video phát đến thời điểm khác (ví dụ: `05:00`), sau đó nhấp chuột trực tiếp vào huy hiệu `02:15`.
5. **Kết quả quan sát**: Trình phát video lập tức tua ngược về đúng giây thứ 135 (`02:15`) và tiếp tục phát mượt mà, giúp việc đối chiếu bài giảng diễn ra tức thì.

### Kịch bản 4: Quét mã QR xác thực chứng chỉ trên thiết bị di động trong mạng nội bộ
1. **Bước 1**: Đăng nhập tài khoản học viên đã hoàn thành 100% khóa học, truy cập mục Chứng chỉ khóa học hoặc mở file PDF chứng chỉ đã tải về.
2. **Bước 2**: Dùng Camera điện thoại hoặc ứng dụng Zalo trên điện thoại thông minh (kết nối chung mạng Wi-Fi LAN) quét mã QR ma trận điểm in trên chứng chỉ.
3. **Bước 3**: Điện thoại tự động mở trình duyệt tới địa chỉ `http://192.168.1.35:3000/certificates/verify/{code}`.
4. **Kết quả quan sát**: Trang xác thực hiển thị ngay lập tức (0ms loading) với huy hiệu xanh *"Chứng chỉ hợp lệ & Đã xác thực"*, đầy đủ thông tin định danh học viên, tên khóa học, mã văn bằng và cho phép tải trực tiếp file PDF chứng chỉ gốc về điện thoại.

---

# V. TỔNG KẾT KẾT QUẢ ĐẠT ĐƯỢC VÀ KẾ HOẠCH TUẦN 10

## 5.1. Kết quả đạt được trong Tuần 9
- **Hoàn thiện trọn vẹn luồng học tập chuyên sâu**: Hệ thống EduAlto không chỉ dừng lại ở việc xem video và làm bài tập, mà đã sở hữu hệ sinh thái khép kín: Tương tác hỏi đáp gắn mốc video, Thông báo đẩy thời gian thực qua WebSocket STOMP, và Cấp phát - Xác thực chứng chỉ điện tử đạt tiêu chuẩn bảo mật ngân hàng/học thuật quốc tế.
- **Bảo mật và chống gian lận vượt bậc**: Ứng dụng thành công cơ chế khóa bi quan CSDL, tem vector hoa cúc đa tầng, viền vi chữ Microtext chống photocopy giả mạo, mã băm SHA-256 và mã QR Code động.
- **Hiệu năng và trải nghiệm người dùng tối ưu**: Thời gian xác thực chứng chỉ SSR 0ms, client native STOMP tự động hồi phục kết nối với exponential backoff, chuông thông báo trực tiếp thân thiện với người dùng.
- **Chất lượng mã nguồn tuyệt đối**: 100% tuân thủ các chuẩn mực chất lượng với 31 test suites frontend (122 tests passed) và toàn bộ test suites backend build success.

## 5.2. Kế hoạch trọng tâm Tuần 10
1. **Trợ giảng thông minh AI Chatbot (AI Learning Assistant)**: Tích hợp mô hình Gemini AI hỗ trợ học viên giải đáp kiến thức, tóm tắt nội dung bài học và gợi ý lộ trình ôn tập cá nhân hóa.
2. **Mở rộng Phân hệ Thanh toán thương mại điện tử**: Tối ưu hóa cổng thanh toán tự động SePay / VietQR và Stripe, quản lý lịch sử đơn hàng và xuất hóa đơn điện tử cho học viên.
3. **Kiểm thử tải và Tối ưu hóa hiệu năng hệ thống (Load & Stress Testing)**: Sử dụng k6 để mô phỏng tải đồng thời 500+ học viên tham gia học tập, thảo luận và kết nối WebSocket, tối ưu hóa bộ nhớ đệm Redis và các câu truy vấn cơ sở dữ liệu quan hệ.

---

# VI. TÀI LIỆU VÀ MÃ NGUỒN

- **Kho lưu trữ mã nguồn chính thức (Git Repository)**: `https://github.com/teehihi/edu-alto` (Nhánh `main`).
- **Commit trọng tâm Tuần 9**:
  - Commit Hash: `f7ae4e54a0047657013198b72ca33a90a1de66a2`
  - Thông điệp Commit: `feat(discussion,notification,certificate): add realtime discussion, notifications and certificate verification`
  - Quy mô triển khai: **54 files changed, 4,649 insertions(+), 433 deletions(-)**.
- **Tài liệu kỹ thuật lưu trữ nội bộ**:
  - `TONG_KET_CONG_VIEC.md`: Tài liệu tổng kết chi tiết danh mục API, kiến trúc STOMP, cấu trúc bảo mật PDFBox và các kịch bản nghiệm thu.
  - `docs/architecture/websocket-strategy.md`: Đặc tả kỹ thuật giao thức WebSocket/STOMP.
  - `docs/security/permission-matrix.md`: Ma trận phân quyền động RBAC.

