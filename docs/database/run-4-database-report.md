# Run 4 Database Report

Tài liệu này mô tả database EduAlto ở thời điểm RUN #4 theo cách dễ dùng để vẽ ERD thủ công. Phần CURRENT chỉ ghi những bảng thật đã được tạo bởi Flyway migration hiện tại. Phần PLANNED là định hướng tương lai, chưa được tạo trong database.

## A. CURRENT DATABASE -- ACTUALLY IMPLEMENTED

### `users`

- Purpose: lưu tài khoản người dùng EduAlto.
- Primary key: `id`.
- Important fields: `full_name`, `email`, `password_hash`, `status`, `email_verified_at`, `last_login_at`, `created_at`, `updated_at`.
- Foreign keys: không có.
- Unique constraints: `uk_users_email(email)`.
- Important indexes: `idx_users_status(status)`.
- Notes: `password_hash` lưu mật khẩu đã hash BCrypt, không lưu plaintext.

### `roles`

- Purpose: lưu vai trò hệ thống như `STUDENT`, `INSTRUCTOR`, `ADMIN`.
- Primary key: `id`.
- Important fields: `name`, `description`, `created_at`, `updated_at`.
- Foreign keys: không có.
- Unique constraints: `uk_roles_name(name)`.
- Important indexes: unique constraint trên `name` hỗ trợ tra cứu role.

### `user_roles`

- Purpose: nối nhiều-nhiều giữa người dùng và vai trò.
- Primary key: composite key `(user_id, role_id)`.
- Important fields: `user_id`, `role_id`, `created_at`.
- Foreign keys: `user_id` references `users(id)`, `role_id` references `roles(id)`.
- Unique constraints: primary key `(user_id, role_id)` đảm bảo một role không gán trùng cho cùng user.
- Important indexes: primary key composite hỗ trợ lookup theo cặp user/role.

### `email_otps`

- Purpose: lưu OTP email đã hash cho xác thực email và đặt lại mật khẩu.
- Primary key: `id`.
- Important fields: `user_id`, `purpose`, `otp_hash`, `attempts`, `max_attempts`, `expires_at`, `verified_at`, `consumed_at`, `created_at`.
- Foreign keys: `user_id` references `users(id)`.
- Unique constraints: không có unique active OTP ở database; service xử lý supersede OTP cũ.
- Important indexes: `idx_email_otps_user_purpose_expires_at(user_id, purpose, expires_at)`.
- Notes: `purpose` hiện gồm `EMAIL_VERIFICATION`, `PASSWORD_RESET`; OTP raw không được lưu.

### `refresh_tokens`

- Purpose: lưu refresh token dạng hash để rotate, revoke và logout.
- Primary key: `id`.
- Important fields: `user_id`, `token_hash`, `device_name`, `expires_at`, `revoked_at`, `created_at`.
- Foreign keys: `user_id` references `users(id)`.
- Unique constraints: `uk_refresh_tokens_token_hash(token_hash)`.
- Important indexes: `idx_refresh_tokens_user_expires_at(user_id, expires_at)`.
- Notes: refresh token raw chỉ trả một lần cho client, database chỉ lưu hash.

## B. EXPECTED FUTURE DATABASE

Các bảng dưới đây là PLANNED -- NOT IMPLEMENTED YET.

### Identity

- PLANNED -- NOT IMPLEMENTED YET: `permissions`.
- PLANNED -- NOT IMPLEMENTED YET: `role_permissions`.
- PLANNED -- NOT IMPLEMENTED YET: `student_profiles`.
- PLANNED -- NOT IMPLEMENTED YET: `instructor_profiles`.

### Course Catalog

- PLANNED -- NOT IMPLEMENTED YET: `categories`.
- PLANNED -- NOT IMPLEMENTED YET: `courses`.
- PLANNED -- NOT IMPLEMENTED YET: `course_categories`.
- PLANNED -- NOT IMPLEMENTED YET: `course_sections`.
- PLANNED -- NOT IMPLEMENTED YET: `lessons`.
- PLANNED -- NOT IMPLEMENTED YET: `lesson_contents`.

### Learning

- PLANNED -- NOT IMPLEMENTED YET: `enrollments`.
- PLANNED -- NOT IMPLEMENTED YET: `learning_progress`.
- PLANNED -- NOT IMPLEMENTED YET: `notes`.
- PLANNED -- NOT IMPLEMENTED YET: `saved_documents`.

### Assessment

- PLANNED -- NOT IMPLEMENTED YET: `quizzes`.
- PLANNED -- NOT IMPLEMENTED YET: `questions`.
- PLANNED -- NOT IMPLEMENTED YET: `question_options`.
- PLANNED -- NOT IMPLEMENTED YET: `quiz_attempts`.
- PLANNED -- NOT IMPLEMENTED YET: `quiz_answers`.
- PLANNED -- NOT IMPLEMENTED YET: `assignments`.
- PLANNED -- NOT IMPLEMENTED YET: `assignment_submissions`.

### Interaction

- PLANNED -- NOT IMPLEMENTED YET: `documents`.
- PLANNED -- NOT IMPLEMENTED YET: `discussions`.
- PLANNED -- NOT IMPLEMENTED YET: `discussion_comments`.
- PLANNED -- NOT IMPLEMENTED YET: `reviews`.
- PLANNED -- NOT IMPLEMENTED YET: `notifications`.
- PLANNED -- NOT IMPLEMENTED YET: `calendar_events`.

### Messaging

- PLANNED -- NOT IMPLEMENTED YET: `conversations`.
- PLANNED -- NOT IMPLEMENTED YET: `conversation_participants`.
- PLANNED -- NOT IMPLEMENTED YET: `messages`.

### Certificate

- PLANNED -- NOT IMPLEMENTED YET: `certificates`.

### Commerce

- PLANNED -- NOT IMPLEMENTED YET: `orders`.
- PLANNED -- NOT IMPLEMENTED YET: `order_items`.
- PLANNED -- NOT IMPLEMENTED YET: `payments`.
- PLANNED -- NOT IMPLEMENTED YET: `coupons`.

### Gamification

- PLANNED -- NOT IMPLEMENTED YET: `achievements`.
- PLANNED -- NOT IMPLEMENTED YET: `user_achievements`.
- PLANNED -- NOT IMPLEMENTED YET: `learning_streaks`.

### Analytics

- PLANNED -- NOT IMPLEMENTED YET: `learning_signals`.
- PLANNED -- NOT IMPLEMENTED YET: `analytics_snapshots`.

### AI / Recommendation

- PLANNED -- NOT IMPLEMENTED YET: `ai_model_versions`.
- PLANNED -- NOT IMPLEMENTED YET: `recommendations`.
- PLANNED -- NOT IMPLEMENTED YET: `recommendation_items`.
- PLANNED -- NOT IMPLEMENTED YET: `recommendation_reasons`.

## C. RELATIONSHIPS

### Current implemented relationships

- `users` 1 -- N `email_otps`.
- `users` 1 -- N `refresh_tokens`.
- `users` N -- N `roles` through `user_roles`.
- `users` 1 -- N `user_roles`.
- `roles` 1 -- N `user_roles`.

### Planned future relationships

- `users` 1 -- 1 `student_profiles`.
- `users` 1 -- 1 `instructor_profiles`.
- `roles` N -- N `permissions` through `role_permissions`.
- `users` 1 -- N `courses` through instructor ownership.
- `categories` N -- N `courses` through `course_categories`.
- `courses` 1 -- N `course_sections`.
- `course_sections` 1 -- N `lessons`.
- `lessons` 1 -- N `lesson_contents`.
- `users` N -- N `courses` through `enrollments`.
- `enrollments` 1 -- N `learning_progress`.
- `lessons` 1 -- N `learning_progress`.
- `users` 1 -- N `notes`.
- `lessons` 1 -- N `notes`.
- `courses` 1 -- N `quizzes`.
- `quizzes` 1 -- N `questions`.
- `questions` 1 -- N `question_options`.
- `quizzes` 1 -- N `quiz_attempts`.
- `users` 1 -- N `quiz_attempts`.
- `quiz_attempts` 1 -- N `quiz_answers`.
- `courses` 1 -- N `assignments`.
- `assignments` 1 -- N `assignment_submissions`.
- `users` 1 -- N `assignment_submissions`.
- `courses` 1 -- N `documents`.
- `users` N -- N `documents` through `saved_documents`.
- `courses` 1 -- N `discussions`.
- `discussions` 1 -- N `discussion_comments`.
- `users` 1 -- N `discussion_comments`.
- `conversations` N -- N `users` through `conversation_participants`.
- `conversations` 1 -- N `messages`.
- `users` 1 -- N `messages`.
- `users` 1 -- N `notifications`.
- `courses` 1 -- N `reviews`.
- `users` 1 -- N `reviews`.
- `users` 1 -- N `certificates`.
- `courses` 1 -- N `certificates`.
- `users` 1 -- N `orders`.
- `orders` 1 -- N `order_items`.
- `orders` 1 -- N `payments`.
- `users` 1 -- N `learning_signals`.
- `learning_signals` N -- 1 `courses` when a signal is course-related.
- `recommendations` 1 -- N `recommendation_items`.
- `recommendations` N -- 1 `ai_model_versions`.

## D. ERD DRAWING ORDER

Draw the current implemented database first:

```text
                 USERS
                   |
        +----------+----------+
        |          |          |
        v          v          v
   USER_ROLES  EMAIL_OTPS  REFRESH_TOKENS
        |
        v
      ROLES
```

Then expand the planned LMS domains around `users` and `courses`:

```text
                              USERS
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
      ROLES                 PROFILE                  AUTH
        |                       |                       |
        v                       v                       v
   PERMISSIONS        STUDENT/INSTRUCTOR        OTP + TOKENS

                              COURSES
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
    CATEGORIES              SECTIONS               ENROLLMENTS
                                |                       |
                                v                       v
                              LESSONS              PROGRESS
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
      QUIZZES              ASSIGNMENTS             DOCUMENTS
        |                       |                       |
        v                       v                       v
    ATTEMPTS              SUBMISSIONS          SAVED DOCUMENTS
```

Finally add collaboration, operations and insight tables around the learning core:

```text
                              COURSES
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
   DISCUSSIONS               REVIEWS              CERTIFICATES
        |
        v
     COMMENTS

                              USERS
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
  CONVERSATIONS           NOTIFICATIONS        LEARNING_SIGNALS
        |                                               |
        v                                               v
     MESSAGES                                  ANALYTICS_SNAPSHOTS
                                                        |
                                                        v
                                                RECOMMENDATIONS
```

Manual drawing tip: put `users` near the upper-left center, `courses` near the center, and `enrollments` between them. Authentication tables should stay close to `users`; lessons and assessments should stay under `courses`; analytics and AI should stay on the right edge because they read from core LMS data rather than owning it.
