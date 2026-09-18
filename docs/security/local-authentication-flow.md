# Local Authentication Flow

Tài liệu này mô tả cách chạy và kiểm thử vertical slice xác thực RUN #4 ở local. Không ghi credential thật vào tài liệu, commit hoặc log.

## Frontend flow

Frontend gọi backend qua `NEXT_PUBLIC_API_BASE_URL`, mặc định:

```text
http://localhost:8080/api/v1
```

Các màn hình public:

- `/login`: đăng nhập bằng email và mật khẩu.
- `/register`: tạo tài khoản học viên.
- `/verify-email`: nhập OTP 6 chữ số để kích hoạt tài khoản.
- `/forgot-password`: yêu cầu OTP đặt lại mật khẩu.
- `/reset-password`: xác thực OTP reset và đặt mật khẩu mới.

Màn hình yêu cầu đăng nhập:

- `/profile`: hiển thị và cập nhật họ tên từ `GET /api/v1/me` và `PUT /api/v1/me`.

Backend hiện trả refresh token trong JSON response. Frontend giữ token ở client để duy trì phiên sau khi refresh trình duyệt, nhưng không log, không hiển thị và xóa phiên khi refresh token hết hạn hoặc logout thất bại.

## Backend APIs

Các endpoint đã dùng trong flow:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/verify-reset-otp`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/me`
- `PUT /api/v1/me`

## Gmail SMTP configuration

Local email delivery uses Gmail SMTP with Google App Password through environment variables only.

Required variables:

```text
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-google-app-password
MAIL_FROM=your-email@gmail.com
```

Security rules:

- Do not commit `.env`.
- Do not place the real app password in `.env.example`, README, Dockerfile or `docker-compose.yml`.
- Do not expose mail credentials to frontend variables.
- Do not log OTP values, passwords, JWTs or refresh tokens.

## Manual local test flow

1. Start PostgreSQL and Redis.
2. Start backend with PostgreSQL, Redis, JWT and Gmail SMTP environment variables.
3. Start frontend.
4. Register a new account.
5. Open the real Gmail verification email and enter the OTP.
6. Log in.
7. Visit `/profile` and confirm `GET /api/v1/me` works.
8. Refresh the browser and confirm the session is restored.
9. Logout and confirm protected user UI is no longer accessible.
10. Log in again.
11. Request forgot password OTP.
12. Open the real Gmail reset email.
13. Enter OTP and set a new password.
14. Log in with the new password.
15. Confirm `/profile` still returns the current user.

Database checks should inspect counts/statuses only. Do not print token hashes or OTP hashes in reports.
