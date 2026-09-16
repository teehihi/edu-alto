# Architecture

## Decision

EduAlto starts as a modular monolith.

Reasons:

- University project scope does not justify microservices.
- Faster local development and testing.
- Lower operational complexity.
- Clear module boundaries still allow future extraction.
- PostgreSQL transactions remain simple.

## High-level architecture

```mermaid
flowchart TB
  Browser[Browser]
  Next[Next.js Frontend]
  API[Spring Boot API]
  Security[Spring Security]
  Modules[Application Modules]
  JPA[Spring Data JPA]
  DB[(PostgreSQL)]
  Redis[(Redis)]
  WS[WebSocket/STOMP]
  OpenAPI[OpenAPI Docs]

  Browser --> Next
  Next --> API
  Browser <-->|Realtime| WS
  WS --> API
  API --> Security
  Security --> Modules
  Modules --> JPA
  JPA --> DB
  Modules --> Redis
  API --> OpenAPI
```

## Backend module dependency

```mermaid
flowchart LR
  Auth --> User
  Profile --> User
  Instructor --> User
  Course --> User
  Enrollment --> Course
  Lesson --> Course
  Learning --> Lesson
  Quiz --> Course
  Assignment --> Course
  Document --> Course
  Discussion --> Course
  Messaging --> User
  Notification --> User
  Schedule --> User
  Review --> Course
  Certificate --> Course
  Analytics --> Learning
  Analytics --> Quiz
  Analytics --> Assignment
  AI -.reads signals.-> Analytics
```

## Backend package structure

```text
com.edualto
├── EduAltoApplication.java
├── common
│   ├── api
│   ├── config
│   ├── exception
│   └── security
├── auth
├── user
├── course
├── enrollment
├── lesson
├── learning
├── quiz
├── assignment
├── document
├── discussion
├── messaging
├── notification
├── schedule
├── review
├── certificate
├── analytics
├── admin
└── ai
```

Each module may contain:

```text
controller/
service/
domain/
repository/
dto/
mapper/
exception/
```

## Frontend structure

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── course/
│   └── marketing/
├── features/
├── hooks/
├── lib/
├── services/
├── types/
├── constants/
└── styles/
```

## Authentication sequence

```mermaid
sequenceDiagram
  participant User
  participant Web
  participant API
  participant Auth
  participant Email
  participant DB

  User->>Web: Submit register form
  Web->>API: POST /api/v1/auth/register
  API->>Auth: Validate and create pending OTP
  Auth->>DB: Store user pending verification
  Auth->>Email: Send OTP
  API-->>Web: Registration pending
  User->>Web: Enter OTP
  Web->>API: POST /api/v1/auth/verify-email
  API->>Auth: Verify OTP
  Auth->>DB: Activate account
  API-->>Web: Account verified
```

## Course enrollment sequence

```mermaid
sequenceDiagram
  participant Student
  participant Web
  participant API
  participant Enrollment
  participant DB
  participant Notification

  Student->>Web: Click Đăng ký khóa học
  Web->>API: POST /api/v1/courses/{id}/enrollments
  API->>Enrollment: Enroll student
  Enrollment->>DB: Create enrollment if allowed
  Enrollment->>Notification: Create notification
  API-->>Web: Enrollment response
```

## Lesson learning sequence

```mermaid
sequenceDiagram
  participant Student
  participant Web
  participant API
  participant Lesson
  participant Progress
  participant Signals

  Student->>Web: Open lesson
  Web->>API: GET /api/v1/lessons/{id}
  API->>Lesson: Load lesson
  Lesson-->>API: Lesson content DTO
  API-->>Web: Lesson response
  Student->>Web: Mark complete
  Web->>API: POST /api/v1/lessons/{id}/complete
  API->>Progress: Update progress
  Progress->>Signals: Emit lesson_completed
```

## Quiz submission sequence

```mermaid
sequenceDiagram
  participant Student
  participant Web
  participant API
  participant Quiz
  participant DB
  participant Progress

  Student->>Web: Submit answers
  Web->>API: POST /api/v1/quizzes/{id}/attempts
  API->>Quiz: Grade attempt
  Quiz->>DB: Store attempt and answers
  Quiz->>Progress: Update assessment progress
  API-->>Web: Score and feedback
```

## Assignment submission sequence

```mermaid
sequenceDiagram
  participant Student
  participant Web
  participant API
  participant Assignment
  participant Storage
  participant DB

  Student->>Web: Submit assignment
  Web->>API: POST /api/v1/assignments/{id}/submissions
  API->>Assignment: Validate submission
  Assignment->>Storage: Store file if present
  Assignment->>DB: Save submission
  API-->>Web: Submission accepted
```

## Messaging/WebSocket sequence

```mermaid
sequenceDiagram
  participant UserA
  participant UserB
  participant WebSocket
  participant API
  participant DB

  UserA->>WebSocket: SEND /app/conversations/{id}/messages
  WebSocket->>API: Validate participant
  API->>DB: Persist message
  API-->>WebSocket: Message DTO
  WebSocket-->>UserB: /topic/conversations/{id}
```

## Notification sequence

```mermaid
sequenceDiagram
  participant Module
  participant Notification
  participant DB
  participant Redis
  participant Web

  Module->>Notification: Create notification command
  Notification->>DB: Persist notification
  Notification->>Redis: Publish notification event
  Redis-->>Web: WebSocket push when connected
```

## Learning progress sequence

```mermaid
sequenceDiagram
  participant Lesson
  participant Progress
  participant Analytics
  participant AI

  Lesson->>Progress: Lesson completed
  Progress->>Progress: Recalculate course completion
  Progress->>Analytics: Store learning signal
  Analytics-.batch.->>AI: Future skill analysis
```

## Future AI recommendation sequence

```mermaid
sequenceDiagram
  participant Scheduler
  participant Signals
  participant AI
  participant Recommendation
  participant Student

  Scheduler->>Signals: Collect learner signals
  Signals->>AI: Build learner feature set
  AI->>Recommendation: Return ranked items and reasons
  Recommendation->>Recommendation: Store model version and reasons
  Student->>Recommendation: GET /api/v1/recommendations
```

## Security foundation

- Stateless JWT planned for access tokens.
- Refresh token rotation planned.
- Password hashing with BCrypt.
- OTP for email verification, forgot password and change email.
- CORS restricted by environment.
- CSRF reviewed per auth strategy; stateless API can disable CSRF with care.
- Global exception handler avoids stack trace exposure.

## WebSocket foundation

Use WebSocket/STOMP for messaging and notifications. REST remains default for CRUD and request/response workflows.

## Review checklist

- No circular module dependency.
- No business logic in controller.
- DTO/entity separation.
- Vietnamese user-facing text.
- Design tokens aligned with Figma.
- Accessibility and responsive foundation present.
- Tests/build pass before integration.
