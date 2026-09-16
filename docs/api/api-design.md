# API Design

Base path: `/api/v1`.

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
    "totalPages": 5
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

- Use nouns, not verbs.
- Use HTTP status codes correctly.
- Validate request DTOs.
- Use `page`, `size`, `sort`, `q` for pagination/search.
- Do not expose stack traces or internal class names.
- Use Vietnamese user-facing `message`, English machine-readable `code`.

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

1. User submits full name, email, password and confirm password.
2. Backend validates input and sends email OTP.
3. User verifies OTP.
4. Account becomes active.

Login does not require OTP every time.

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

## Assignment

```text
GET  /api/v1/assignments/{assignmentId}
POST /api/v1/assignments/{assignmentId}/submissions
GET  /api/v1/assignment-submissions/{submissionId}
POST /api/v1/assignment-submissions/{submissionId}/grade
```

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
CONNECT /ws
SEND /app/conversations/{conversationId}/messages
SUBSCRIBE /topic/conversations/{conversationId}
SUBSCRIBE /user/queue/notifications
```

## Notifications

```text
GET  /api/v1/me/notifications
POST /api/v1/me/notifications/{notificationId}/read
POST /api/v1/me/notifications/read-all
```

## Recommendations

Future AI extension:

```text
GET /api/v1/me/recommendations
POST /api/v1/admin/ai/model-versions
```

If no recommendation exists, frontend shows Vietnamese empty state.

## HTTP status

- `200 OK` for successful reads/updates.
- `201 Created` for create.
- `204 No Content` for delete.
- `400 Bad Request` for malformed input.
- `401 Unauthorized` for missing/invalid auth.
- `403 Forbidden` for insufficient permission.
- `404 Not Found` for missing resource.
- `409 Conflict` for duplicate state.
- `422 Unprocessable Entity` for domain validation failure.
- `500 Internal Server Error` for unexpected server error with safe message.
