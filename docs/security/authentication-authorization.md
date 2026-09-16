# Authentication and Authorization

Tài liệu này định nghĩa nền tảng xác thực và phân quyền cho EduAlto. Mục tiêu là đủ an toàn cho foundation, dễ mở rộng khi thêm module, và không làm rò rỉ lỗi kỹ thuật ra frontend.

## Identity model

- `users` là danh tính chính.
- `roles` gồm `STUDENT`, `INSTRUCTOR`, `ADMIN`.
- `permissions` dùng cho quyền chi tiết, gắn với role qua `role_permissions`.
- User có thể có nhiều role, nhưng UI foundation nên tối ưu cho vai trò chính.
- Account status tối thiểu: `PENDING_VERIFICATION`, `ACTIVE`, `LOCKED`, `DISABLED`.

## Registration

- User đăng ký bằng full name, email, password.
- Password được hash bằng thuật toán mạnh như BCrypt/Argon2, không lưu plaintext.
- Email phải unique, normalize trước khi lưu.
- Account mới ở trạng thái `PENDING_VERIFICATION`.
- OTP xác thực email phải có TTL, giới hạn số lần thử và lưu dạng hash.

## Login

- Login bằng email/password.
- Chỉ account `ACTIVE` được login.
- Error message phải an toàn: không tiết lộ email tồn tại hay không.
- Ví dụ message: `Email hoặc mật khẩu không đúng`.
- Endpoint login/register/forgot password phải có rate limiting.

## Token strategy

- Access token ngắn hạn dùng cho API request.
- Refresh token dài hơn, lưu server-side dạng hash để revoke/rotate.
- Token chứa tối thiểu `sub`, `roles`, `jti`, `iat`, `exp`.
- Không nhét dữ liệu profile lớn vào token.
- Logout revoke refresh token hiện tại.

## Authorization layers

1. Route-level security: endpoint yêu cầu authentication/role/permission.
2. Resource-level security: service kiểm tra ownership, enrollment, instructor ownership.
3. Domain rule: service/domain kiểm tra trạng thái course, deadline, submission policy.

Không chỉ dựa vào frontend để ẩn action. Backend luôn kiểm tra quyền.

## Resource ownership rules

- Student chỉ xem course private nếu đã enroll hoặc có quyền đặc biệt.
- Student chỉ xem progress, note, saved document, notification của chính mình.
- Instructor chỉ quản lý course do mình sở hữu, trừ khi admin can thiệp.
- Instructor chấm submission thuộc course của mình.
- Admin quản lý user/content/system config nhưng không mặc định đọc message riêng tư.

## Password reset

- `POST /api/v1/auth/forgot-password` luôn trả message an toàn.
- Reset token/OTP có TTL ngắn, lưu hash.
- Sau reset password, revoke refresh token đang hoạt động của user.

## WebSocket auth

- `CONNECT /ws` phải xác thực JWT.
- Backend kiểm tra participant trước khi cho subscribe/send vào conversation topic.
- Client không được tự khai `senderId`.

## Error response

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Bạn không có quyền thực hiện thao tác này",
    "details": []
  },
  "timestamp": "2026-09-16T00:00:00Z",
  "path": "/api/v1/courses/{courseId}"
}
```

Không expose stack trace, SQL error, Java class name hoặc raw `AxiosError`.

## Production checklist

- Cấu hình CORS theo domain thật.
- Bật HTTPS ở tầng deploy.
- Secret lấy từ environment/secret manager.
- Rate limit auth và upload endpoint.
- Log auth event quan trọng nhưng không log token/password/OTP.
- Có audit trail cho admin action nhạy cảm.

