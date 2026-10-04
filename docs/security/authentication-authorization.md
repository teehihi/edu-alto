# Authentication and Authorization

Tài liệu này định nghĩa nền tảng xác thực và phân quyền cho EduAlto. Mục tiêu là đủ an toàn cho foundation, dễ mở rộng khi thêm module, và không làm rò rỉ lỗi kỹ thuật ra frontend.

## Identity model

- `users` là danh tính chính.
- `roles` gồm `STUDENT`, `INSTRUCTOR`, `ADMIN`.
- RUN #3 dùng phân quyền theo role. `permissions` và `role_permissions` là extension cho quyền chi tiết khi implementation cần đến.
- User có thể có nhiều role, nhưng UI foundation nên tối ưu cho vai trò chính.
- Account status tối thiểu: `PENDING_VERIFICATION`, `ACTIVE`, `LOCKED`, `DISABLED`.

## Registration

- User đăng ký bằng full name, email, password.
- Password được hash bằng thuật toán mạnh như BCrypt/Argon2, không lưu plaintext.
- Email phải unique, normalize trước khi lưu.
- Account mới ở trạng thái `PENDING_VERIFICATION`.
- OTP xác thực email phải có TTL, giới hạn số lần thử và lưu dạng hash.
- BCrypt passwords must fit within 72 UTF-8 bytes; character count alone is insufficient for Vietnamese passwords. Oversized registration/reset requests return `400 PASSWORD_TOO_LONG`.
- Only `PENDING_VERIFICATION` accounts can be activated by email OTP. Locked or disabled accounts cannot reactivate through this flow.

## Login

- Login bằng email/password.
- Chỉ account `ACTIVE` được login.
- Error message phải an toàn: không tiết lộ email tồn tại hay không.
- Ví dụ message: `Email hoặc mật khẩu không đúng`.
- Endpoint login/register/forgot password phải có rate limiting.
- Unverified login returns ACCOUNT_NOT_VERIFIED without replacing OTP or clearing its failed attempts. New codes are requested through resend-verification, which enforces cooldown. The verification UI does not claim a new email was sent by login.

Auth HTTP rate limiting runs before JWT authentication for credential and OTP POST endpoints. The current modular monolith uses a bounded in-memory counter per servlet client IP: 60 requests per 60-second window, at most 10,000 tracked IPs. Rejections return `429 AUTH_RATE_LIMIT_EXCEEDED` and `Retry-After`; refresh and logout remain available. Limits are configurable through `AUTH_RATE_LIMIT_MAX_REQUESTS`, `AUTH_RATE_LIMIT_WINDOW_SECONDS`, and `AUTH_RATE_LIMIT_MAX_CLIENTS`. Integration fixtures raise the request limit without disabling the filter. Multiple backend instances need a shared counter or an ingress limit; a trusted proxy must supply the real servlet client IP before this policy is deployed behind it.

## Token strategy

- Access token ngắn hạn dùng cho API request.
- Refresh token dài hơn, lưu server-side dạng hash để revoke/rotate.
- Token chứa tối thiểu `sub`, `roles`, `jti`, `iat`, `exp`.
- Không nhét dữ liệu profile lớn vào token.
- Logout revoke refresh token hiện tại.
- Refresh token lookup uses a database write lock so only one concurrent rotation can succeed. Revocations for an inactive account commit even when refresh returns `401`.

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
- OTP verification/consumption uses a write lock. Invalid attempts commit on business errors, while successful consumption, password change/account activation and refresh revocation share one transaction. Attempt limits count incorrect codes, and a verified reset OTP remains blocked after reaching the limit.

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
