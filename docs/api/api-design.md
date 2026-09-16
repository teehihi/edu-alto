# API Design

Base path: `/api/v1`.

API của EduAlto dùng REST, JSON, DTO rõ ràng và error format nhất quán. User-facing `message` dùng tiếng Việt; API path, field name và machine-readable `code` dùng tiếng Anh.

## Response format

Success:

```json
{
  "success": true,
  "data": {},
  "meta": null
}
```

Paginated success:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 0,
    "size": 20,
    "totalElements": 100,
    "totalPages": 5,
    "sort": "publishedAt,desc"
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": []
  },
  "timestamp": "2026-09-16T00:00:00Z",
  "path": "/api/v1/courses"
}
```

## Conventions

- Dùng nouns, không dùng verbs trong resource path.
- Prefix mọi endpoint bằng `/api/v1`.
- Request/response dùng DTO, không expose entity.
- Pagination dùng `page`, `size`, `sort`.
- Search/filter dùng `q` và field filter rõ nghĩa.
- `message` an toàn cho end user, không chứa stack trace/class name.
- OpenAPI phải phản ánh endpoint thật.

## Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/verify-email
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

Registration flow:

1. User gửi full name, email, password và confirm password.
2. Backend validate input, hash password và gửi email OTP.
3. User verify OTP.
4. Account chuyển sang `ACTIVE`.

Login không yêu cầu OTP mỗi lần.

## Users and profile

```text
GET /api/v1/me
PUT /api/v1/me
GET /api/v1/me/profile
PUT /api/v1/me/profile
```

Admin:

```text
GET  /api/v1/admin/users
GET  /api/v1/admin/users/{userId}
PUT  /api/v1/admin/users/{userId}/status
POST /api/v1/admin/users/{userId}/roles
```

## Courses

```text
GET    /api/v1/courses
GET    /api/v1/courses/{courseId}
POST   /api/v1/courses
PUT    /api/v1/courses/{courseId}
DELETE /api/v1/courses/{courseId}
GET    /api/v1/categories
POST   /api/v1/courses/{courseId}/enrollments
GET    /api/v1/me/enrollments
```

Filters:

```text
GET /api/v1/courses?q=java&category=backend&level=beginner&page=0&size=12&sort=publishedAt,desc
```

Public course listing chỉ trả khóa học `PUBLISHED`.

## Learning

```text
GET  /api/v1/courses/{courseId}/sections
GET  /api/v1/lessons/{lessonId}
POST /api/v1/lessons/{lessonId}/complete
GET  /api/v1/me/courses/{courseId}/progress
```

## Quiz

```text
GET  /api/v1/quizzes/{quizId}
POST /api/v1/quizzes/{quizId}/attempts
GET  /api/v1/quiz-attempts/{attemptId}
```

Backend quyết định khi nào trả đáp án đúng theo policy của quiz, không để frontend tự kiểm soát.

## Assignment

```text
GET  /api/v1/assignments/{assignmentId}
POST /api/v1/assignments/{assignmentId}/submissions
GET  /api/v1/assignment-submissions/{submissionId}
POST /api/v1/assignment-submissions/{submissionId}/grade
```

File upload phải validate dung lượng, loại file và storage metadata trước production.

## Documents and notes

```text
GET    /api/v1/courses/{courseId}/documents
POST   /api/v1/documents/{documentId}/save
DELETE /api/v1/documents/{documentId}/save
GET    /api/v1/me/saved-documents
GET    /api/v1/me/notes
POST   /api/v1/me/notes
PUT    /api/v1/me/notes/{noteId}
DELETE /api/v1/me/notes/{noteId}
```

## Discussion

```text
GET  /api/v1/courses/{courseId}/discussions
POST /api/v1/courses/{courseId}/discussions
POST /api/v1/discussions/{discussionId}/comments
```

## Messaging and WebSocket

REST:

```text
GET  /api/v1/conversations
POST /api/v1/conversations
GET  /api/v1/conversations/{conversationId}/messages
```

WebSocket/STOMP:

```text
CONNECT   /ws
SEND      /app/conversations/{conversationId}/messages
SUBSCRIBE /topic/conversations/{conversationId}
SUBSCRIBE /user/queue/notifications
```

REST là nguồn đồng bộ lại sau reconnect; WebSocket không thay thế persistence.

## Notifications

```text
GET  /api/v1/me/notifications
POST /api/v1/me/notifications/{notificationId}/read
POST /api/v1/me/notifications/read-all
```

## Analytics

```text
GET /api/v1/me/analytics/learning-summary
GET /api/v1/instructor/courses/{courseId}/analytics
GET /api/v1/admin/analytics/overview
```

Student chỉ đọc dữ liệu của chính mình. Instructor chỉ đọc course mình quản lý. Admin đọc toàn hệ thống.

## Recommendations

Future AI extension:

```text
GET  /api/v1/me/recommendations
POST /api/v1/admin/ai/model-versions
GET  /api/v1/admin/ai/model-versions
```

Nếu chưa có recommendation, frontend hiển thị `Chưa có gợi ý học tập phù hợp`.

## HTTP status

- `200 OK` cho read/update thành công.
- `201 Created` cho create.
- `204 No Content` cho delete/mark action không cần body.
- `400 Bad Request` cho malformed input.
- `401 Unauthorized` cho thiếu/sai auth.
- `403 Forbidden` cho không đủ quyền.
- `404 Not Found` cho resource không tồn tại hoặc không được phép biết tồn tại.
- `409 Conflict` cho duplicate/trạng thái xung đột.
- `422 Unprocessable Entity` cho domain validation fail.
- `500 Internal Server Error` cho lỗi bất ngờ với message an toàn.

