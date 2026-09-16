# Redis Strategy

Redis trong EduAlto là hạ tầng hỗ trợ, không phải nguồn dữ liệu chính. PostgreSQL giữ dữ liệu bền vững; Redis chỉ dùng cho cache ngắn hạn, rate limiting, WebSocket/session presence và các dữ liệu có thể tái tạo.

## Use cases

- Cache danh mục ít thay đổi như `categories`, course filter options, homepage featured courses.
- Lưu OTP/email verification tạm thời nếu phase triển khai chọn Redis thay vì DB OTP table.
- Rate limit theo IP/user cho auth endpoint và API nhạy cảm.
- Presence online/offline cho messaging.
- Pub/Sub hoặc message broker relay cho WebSocket khi scale nhiều instance.
- Idempotency key ngắn hạn cho request dễ bị retry như submit assignment metadata.

## Non-use cases

- Không lưu dữ liệu học tập chính chỉ trong Redis.
- Không dùng Redis để thay thế transaction PostgreSQL.
- Không cache dữ liệu permission nhạy cảm quá lâu.
- Không lưu plaintext password, access token hoặc OTP plaintext.

## Key naming

```text
edualto:cache:categories:v1
edualto:cache:courses:featured:v1
edualto:otp:email:{emailHash}
edualto:ratelimit:auth:{ipHash}
edualto:ratelimit:user:{userId}:{routeKey}
edualto:presence:user:{userId}
edualto:idempotency:{key}
```

Key chứa email/IP phải dùng hash ổn định, không đưa PII trực tiếp vào Redis key.

## TTL guidance

| Data | TTL gợi ý | Ghi chú |
| --- | ---: | --- |
| Email OTP | 5-10 phút | Lưu hash OTP, giới hạn số lần thử |
| Auth rate limit | 1-15 phút | Tùy endpoint |
| Course/category cache | 5-30 phút | Invalidate khi admin/instructor cập nhật |
| Presence | 30-90 giây | Refresh bằng heartbeat |
| Idempotency key | 10-30 phút | Chỉ lưu kết quả tối thiểu |

## Cache invalidation

- Course cache phải invalid khi course publish/unpublish/update.
- Category cache invalid khi admin thay đổi category.
- Permission/role cache nếu có phải invalid ngay khi admin thay đổi role.
- Không dựa vào TTL đơn thuần cho dữ liệu phân quyền quan trọng.

## Failure behavior

- Nếu Redis lỗi, API đọc dữ liệu chính vẫn hoạt động bằng PostgreSQL.
- Auth rate limit fail-closed hay fail-open phải được quyết định theo endpoint; login/register production nên fail-closed có message an toàn.
- WebSocket presence có thể degrade, không làm mất message vì message đã persist trong PostgreSQL.

## Local development

- Redis chạy bằng Docker Compose trong phase triển khai.
- Test service không phụ thuộc Redis thật trừ integration test có profile riêng.
- Cache key prefix phải cấu hình qua environment để tránh đụng môi trường.

