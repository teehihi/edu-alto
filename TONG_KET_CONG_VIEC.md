# TỔNG KẾT TÍNH NĂNG CẤP VÀ XÁC THỰC CHỨNG CHỈ ĐIỆN TỬ (EDU-47)

Tài liệu này ghi lại chi tiết các công việc đã triển khai và hoàn thành cho tính năng **Cấp chứng chỉ điện tử (E-Certificate) tự động khi hoàn thành 100% khóa học** (Task `EDU-47` / Parent `EDU-15`) trên hệ thống EduAlto.

---

## 1. Mục tiêu & Nghiệp vụ đã hoàn thành

1. **Tự động cấp chứng chỉ**:
   - Khi học viên hoàn thành 100% tất cả các bài học trong khóa học đã ghi danh, hệ thống tự động sinh bản ghi chứng nhận có mã định danh duy nhất theo định dạng `EA-<HEX_MÃ_DUY_NHẤT>`.
2. **Sinh file PDF chứng chỉ chuyên nghiệp (E-Certificate PDF)**:
   - Sử dụng thư viện **Apache PDFBox 3.0.8** sinh file PDF chuẩn khổ ngang A4 Landscape.
   - Nhúng trực tiếp font Unicode TrueType tiếng Việt (`Roboto-Regular.ttf` và `Roboto-Bold.ttf`), hiển thị đầy đủ dấu tiếng Việt không bị lỗi font hay vỡ layout.
   - Thiết kế sang trọng theo tông màu thương hiệu EduAlto: Primary `#20B486`, Heading `#101A2C`, viền đôi trang trọng, huy hiệu hoàn thành, tên học viên, tên khóa học, ngày cấp và chữ ký giảng viên.
3. **Mã QR Code xác thực tức thì**:
   - Tích hợp thư viện **ZXing** (`zxing:core` và `zxing:javase`) sinh mã QR Code ma trận điểm rõ nét.
   - Mã QR được nhúng trực tiếp vào góc dưới của file PDF chứng chỉ và hiển thị trực tiếp trên giao diện web học viên.
   - Đường dẫn xác thực trong QR Code tự động liên kết tới trang công khai: `/certificates/verify/{certificateNumber}`.
4. **Hỗ trợ quét QR trên thiết bị di động (Mạng nội bộ / LAN)**:
   - Tự động phát hiện và cấu hình địa chỉ IP Wi-Fi (`http://192.168.1.35:3000`) cho mã QR thay vì `localhost`, giúp điện thoại quét mã QR mở được ngay trang xác thực trên trình duyệt di động mà không bị lỗi kết nối.
   - Mở cấu hình CORS trên Backend cho dải mạng LAN (`192.168.*.*`, `10.*.*.*`, `172.*.*.*`) và localhost không hạn chế cổng.
5. **Trang xác thực chứng chỉ công khai (Public Verification Page)**:
   - Bất kỳ ai (nhà tuyển dụng, nhà trường, bạn bè) khi quét mã QR hoặc truy cập URL `/certificates/verify/{code}` đều có thể xem chứng chỉ xác thực mà **không cần đăng nhập**.
   - Hiển thị huy hiệu xanh "Chứng chỉ hợp lệ", trạng thái bảo lưu bởi EduAlto, các nút chia sẻ, sao chép liên kết và tải file PDF chứng chỉ gốc.
6. **Bộ công cụ trên giao diện học viên**:
   - Trang `/learning/certificates/[courseId]`: Học viên có thể xem trực quan chứng chỉ của mình, tải file PDF về máy, in trực tiếp (`window.print` với CSS `@media print` ẩn các thành phần thừa chỉ in nguyên vẹn chứng chỉ), và chia sẻ qua Web Share API hoặc sao chép link.
   - Trang `/learning/certificates`: Bổ sung hiển thị mã chứng chỉ trực tiếp trên từng thẻ khóa học đã hoàn thành.

---

## 2. Các tệp tin đã tạo mới và chỉnh sửa

### Backend (Java / Spring Boot)
- `backend/pom.xml`: Bổ sung dependencies `com.google.zxing:core:3.5.3` và `com.google.zxing:javase:3.5.3`.
- `backend/src/main/resources/fonts/`: Thêm 2 font Unicode `Roboto-Regular.ttf` và `Roboto-Bold.ttf`.
- `backend/src/main/resources/application.yml` & `docker-compose.yml`: Cấu hình `EDUALTO_FRONTEND_URL` và `CORS_ALLOWED_ORIGINS` hỗ trợ IP mạng LAN.
- `backend/src/main/java/com/edualto/certificate/service/QrCodeGenerator.java` *(Tạo mới)*: Service sinh ảnh QR code byte array PNG và chuỗi Base64 Data URL.
- `backend/src/main/java/com/edualto/certificate/service/CertificatePdfGenerator.java` *(Tạo mới)*: Service vẽ và kết xuất file PDF chứng chỉ chuẩn A4 Landscape, nhúng font UTF-8, viền đôi và ảnh QR code.
- `backend/src/main/java/com/edualto/certificate/dto/CertificateVerificationResponse.java` *(Tạo mới)*: DTO phản hồi dữ liệu xác thực công khai.
- `backend/src/main/java/com/edualto/certificate/repository/CertificateRepository.java`: Bổ sung phương thức `findByCertificateNumber(String certificateNumber)`.
- `backend/src/main/java/com/edualto/certificate/dto/CertificateResponse.java`: Bổ sung `verificationUrl` và `qrCodeDataUrl`.
- `backend/src/main/java/com/edualto/certificate/service/CertificateService.java`: Tích hợp sinh PDF, QR code, hỗ trợ tham số `baseUrl` và tự động fallback sang URL LAN.
- `backend/src/main/java/com/edualto/certificate/controller/CertificateController.java`:
  - `GET /api/v1/me/courses/{courseId}/certificate/pdf`: Tải PDF chứng chỉ học viên hiện tại.
  - `GET /api/v1/certificates/verify/{certificateNumber}`: Xác thực công khai chứng chỉ.
  - `GET /api/v1/certificates/{certificateNumber}/pdf`: Tải file PDF chứng chỉ công khai.
- `backend/src/main/java/com/edualto/common/security/SecurityConfig.java`: Phân quyền `permitAll()` cho các endpoint xác thực chứng chỉ công khai và cho phép CORS IP LAN.

### Frontend (Next.js / TypeScript / Tailwind CSS)
- `frontend/src/lib/api.ts`: Bổ sung `apiBlobRequest` tải file nhị phân và hàm `getApiBaseUrl()` tự động chuyển host sang IP LAN khi truy cập qua thiết bị di động.
- `frontend/src/lib/certificate-client.ts`: Thêm các hàm `downloadCertificatePdf`, `verifyCertificate`, `downloadPublicCertificatePdf`.
- `frontend/src/app/certificates/verify/[code]/page.tsx` & `frontend/src/features/certificate/verify-certificate-page.tsx` *(Tạo mới)*: Trang giao diện xác thực chứng chỉ công khai.
- `frontend/src/features/learning/course-certificate-page.tsx`: Cập nhật hiển thị mã QR, nút "Tải PDF", "Chia sẻ", "In chứng chỉ", tự động điều chỉnh URL theo môi trường.
- `frontend/src/features/learning/certificate-list-view.tsx`: Hiển thị mã chứng nhận trên danh sách chứng chỉ.
- `frontend/src/features/learning/course-certificate-page.test.tsx` *(Tạo mới)*: Bộ kiểm thử đơn vị cho trang chứng chỉ và xác thực.

---

## 3. Hướng dẫn kiểm thử chức năng

1. **Kiểm tra trên máy tính**:
   - Đăng nhập bằng tài khoản học viên: `vanhau123w@gmail.com`.
   - Truy cập trang chứng chỉ khóa học đã hoàn thành 100%:
     `http://localhost:3000/learning/certificates/c1000000-0000-0000-0000-000000000002`
   - Bấm **"Tải PDF chứng chỉ"**: Trình duyệt sẽ tải về file `certificate-EA-....pdf` có dấu tiếng Việt chuẩn và mã QR.
   - Bấm **"In chứng chỉ"**: Trình duyệt mở hộp thoại in với định dạng A4 chuẩn.
   - Bấm **"Chia sẻ"**: Hệ thống sao chép liên kết xác thực vào bộ nhớ tạm.
2. **Kiểm tra quét mã QR bằng điện thoại**:
   - Kết nối điện thoại cùng mạng Wi-Fi với máy tính.
   - Dùng camera điện thoại hoặc Zalo quét mã QR hiển thị ở góc chứng chỉ trên màn hình máy tính (hoặc trên file PDF).
   - Điện thoại mở liên kết `http://192.168.1.35:3000/certificates/verify/EA-...` hiển thị huy hiệu xanh **"Chứng chỉ hợp lệ"**, họ tên học viên **Văn Hậu Phạm**, tên khóa học và ngày cấp thành công 100%.
