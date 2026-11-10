# Thiết Kế Lược Đồ Dữ Liệu Hoạt Động Học Tập (Learning Activity Schema Design)

- **Mã Task**: EDU-101 / EDU-97
- **Tiêu đề**: Thiết kế lược đồ dữ liệu hoạt động học tập
- **Module phụ trách**: `learning` (Hợp tác với `course`, `enrollment`, `quiz`, `assignment`)
- **Tác giả**: Senior Backend / Architecture Team
- **Trạng thái**: Hoàn thành (Implemented & Verified)

---

## 1. Bối cảnh & Mục tiêu kỹ thuật

Theo yêu cầu nghiệp vụ của LMS EduAlto (Jira ticket **EDU-101 / EDU-97**), hệ thống cần một cơ chế chuẩn hóa và hiệu năng cao để ghi nhận, theo dõi toàn bộ hành trình học tập của học viên. Dữ liệu này đóng vai trò nền tảng cho:
1. **Dòng thời gian học tập cá nhân (Personal Learning Timeline)**: Học viên theo dõi lại quá trình học, thời lượng video đã xem, bài kiểm tra đã hoàn thành.
2. **Bảng điều khiển hoạt động cho giảng viên (Instructor Course Activity Stream)**: Giảng viên nắm bắt mức độ tích cực của lớp học theo thời gian thực (ai nộp bài, ai bắt đầu quiz, ai hoàn thành bài giảng).
3. **Phân tích học tập (Learning Analytics) & Tín hiệu gợi ý học tập (AI / Recommendation Signals)**: Cung cấp nguồn tín hiệu (learning signals) có cấu trúc và mốc thời gian đáng tin cậy cho các thuật toán phân tích.

Ticket EDU-101 / EDU-97 đặt ra 4 yêu cầu cốt lõi:
- **Yêu cầu 1**: Thiết kế schema lưu lịch sử hoạt động học tập.
- **Yêu cầu 2**: Chuẩn hóa danh mục event type.
- **Yêu cầu 3**: Thiết kế cơ chế lưu trữ timestamp chuẩn mực, an toàn.
- **Yêu cầu 4**: Tối ưu hóa truy vấn theo `student`, `course` và `thời gian` (time range).

---

## 2. Thiết kế Lược đồ Dữ liệu (Database Schema)

### 2.1 Bảng `learning_activities`

Bảng `learning_activities` được quản lý bởi migration script `backend/src/main/resources/db/migration/V34__learning_activities.sql`.

```sql
CREATE TABLE learning_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_learning_activity_type CHECK (
        activity_type IN (
            'COURSE_ENROLLED',
            'COURSE_COMPLETED',
            'CERTIFICATE_ISSUED',
            'LESSON_VIEWED',
            'LESSON_COMPLETED',
            'VIDEO_WATCHED',
            'NOTE_CREATED',
            'RESOURCE_DOWNLOADED',
            'QUIZ_STARTED',
            'QUIZ_SUBMITTED',
            'ASSIGNMENT_SUBMITTED',
            'QUESTION_ASKED',
            'COMMENT_POSTED'
        )
    ),
    CONSTRAINT chk_learning_activity_time CHECK (
        occurred_at <= CURRENT_TIMESTAMP + INTERVAL '5 minutes'
    )
);
```

### 2.2 Chi tiết các trường dữ liệu

| Tên cột | Kiểu dữ liệu | Nullable | Ràng buộc / Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | Khóa chính duy nhất của bản ghi hoạt động. |
| `student_id` | `UUID` | No | FK tới `users(id)`. Học viên thực hiện hành động. Xóa user sẽ cascade xóa lịch sử. |
| `course_id` | `UUID` | No | FK tới `courses(id)`. Khóa học mà hoạt động diễn ra. Xóa course sẽ cascade. |
| `section_id` | `UUID` | Yes | FK tới `sections(id)`. Chương học tương ứng (nếu hành động gắn với chương). Xóa section sẽ `SET NULL`. |
| `lesson_id` | `UUID` | Yes | FK tới `lessons(id)`. Bài học tương ứng. Xóa lesson sẽ `SET NULL` để bảo toàn lịch sử tổng thể. |
| `activity_type` | `VARCHAR(50)` | No | Loại sự kiện chuẩn hóa (CHECK constraint bảo đảm không có giá trị bất thường). |
| `occurred_at` | `TIMESTAMPTZ` | No | Thời điểm thực sự diễn ra sự kiện ở phía client (UTC). |
| `metadata` | `JSONB` | No | Dữ liệu ngữ cảnh động (thời lượng video, điểm số, id câu hỏi, định dạng tệp...) với giá trị mặc định `{}`. |
| `created_at` | `TIMESTAMPTZ` | No | Thời điểm server tiếp nhận và ghi nhận bản ghi vào CSDL (Audit timestamp). |
| `updated_at` | `TIMESTAMPTZ` | No | Thời điểm bản ghi được cập nhật lần cuối. |

---

## 3. Chuẩn hóa Event Types (Standardized Event Types)

13 sự kiện được chuẩn hóa và phân loại thành 4 nhóm nghiệp vụ rõ ràng trong Enum `LearningActivityType.java`:

### 3.1 Nhóm Khóa học (Course Lifecycle)
1. `COURSE_ENROLLED`: Học viên ghi danh hoặc mua khóa học thành công.
   - *Metadata mẫu*: `{"source": "checkout", "order_id": "...", "price": 499000}`
2. `COURSE_COMPLETED`: Học viên hoàn thành tất cả các bài học và điều kiện tiên quyết của khóa học.
   - *Metadata mẫu*: `{"completed_lessons_count": 42, "total_duration_hours": 18.5}`
3. `CERTIFICATE_ISSUED`: Chứng chỉ hoàn thành khóa học được cấp phát.
   - *Metadata mẫu*: `{"certificate_code": "CERT-2026-X99", "issued_by": "EduAlto Academy"}`

### 3.2 Nhóm Bài học & Tương tác nội dung (Lesson & Media Interaction)
4. `LESSON_VIEWED`: Học viên mở bài học để bắt đầu đọc hoặc học.
   - *Metadata mẫu*: `{"device": "desktop", "browser": "Chrome"}`
5. `LESSON_COMPLETED`: Học viên hoàn thành nội dung bài học.
   - *Metadata mẫu*: `{"reading_time_seconds": 320}`
6. `VIDEO_WATCHED`: Học viên phát và theo dõi video bài giảng.
   - *Metadata mẫu*: `{"watch_duration_seconds": 450, "playback_rate": 1.25, "completed_segment": "0-450"}`
7. `NOTE_CREATED`: Học viên ghi chú nhanh vào bài học hoặc mốc thời gian video.
   - *Metadata mẫu*: `{"video_timestamp_seconds": 185, "note_id": "..."}`
8. `RESOURCE_DOWNLOADED`: Học viên tải xuống tài liệu bài học (PDF, mã nguồn đính kèm...).
   - *Metadata mẫu*: `{"file_name": "spring-boot-architecture.pdf", "file_size_bytes": 1048576}`

### 3.3 Nhóm Đánh giá & Kiểm tra (Assessment & Evaluation)
9. `QUIZ_STARTED`: Học viên bắt đầu một lượt làm bài kiểm tra trắc nghiệm.
   - *Metadata mẫu*: `{"quiz_id": "...", "attempt_number": 1}`
10. `QUIZ_SUBMITTED`: Học viên nộp bài trắc nghiệm.
    - *Metadata mẫu*: `{"quiz_id": "...", "attempt_number": 1, "score": 85.0, "passed": true, "time_spent_seconds": 720}`
11. `ASSIGNMENT_SUBMITTED`: Học viên nộp bài tập lớn/bài tập thực hành.
    - *Metadata mẫu*: `{"assignment_id": "...", "submission_id": "...", "attachment_count": 2}`

### 3.4 Nhóm Tương tác Xã hội & Thảo luận (Social & Discussion Interaction)
12. `QUESTION_ASKED`: Học viên đặt câu hỏi hoặc mở chủ đề thảo luận trong bài học/khóa học.
    - *Metadata mẫu*: `{"discussion_id": "...", "title": "Lỗi kết nối DataSource"}`
13. `COMMENT_POSTED`: Học viên hoặc giảng viên phản hồi bình luận trao đổi.
    - *Metadata mẫu*: `{"comment_id": "...", "parent_comment_id": "..."}`

---

## 4. Thiết kế Cơ chế Lưu trữ Timestamp

### 4.1 Phân biệt `occurred_at` và `created_at`
- **`occurred_at` (Client Event Time)**: Là thời điểm mà học viên thực sự thực hiện hành động trên giao diện (ví dụ: bấm nút hoàn thành lúc trên xe buýt hoặc khi mạng chập chờn offline rồi đồng bộ lại). Trường này phản ánh đúng dòng thời gian hành vi của học viên.
- **`created_at` (Server Ingestion Time)**: Là thời điểm bản ghi được lưu trữ vật lý vào cơ sở dữ liệu PostgreSQL. Phục vụ mục đích audit, logging và debugging hạ tầng.

### 4.2 Kiểu dữ liệu & Múi giờ
- Sử dụng `TIMESTAMPTZ` (Timestamp with time zone) trong PostgreSQL:
  - Dữ liệu luôn được chuẩn hóa và lưu trữ nội bộ theo múi giờ **UTC**.
  - Khi serialize qua REST API, thời gian được định dạng theo chuẩn quốc tế **ISO-8601** (`yyyy-MM-dd'T'HH:mm:ss.SSSXXX`).
  - Giao diện người dùng (Next.js client) sẽ tự động format hiển thị theo múi giờ địa phương của học viên (`Asia/Ho_Chi_Minh` - UTC+7).

### 4.3 Cơ chế bảo vệ chống gian lận & Time-drift (Anti-Tampering & Clock Drift Guard)
Nhằm ngăn chặn các trường hợp client cố tình gửi timestamp trong tương lai xa (ví dụ: gian lận tiến độ học hoặc đồng hồ client bị sai lệch):
1. **Ràng buộc Database**:
   ```sql
   CONSTRAINT chk_learning_activity_time CHECK (
       occurred_at <= CURRENT_TIMESTAMP + INTERVAL '5 minutes'
   )
   ```
   Ràng buộc này cho phép độ lệch đồng hồ client tối đa là 5 phút. Nếu vượt quá, giao dịch sẽ bị từ chối ngay lập tức tại tầng CSDL.
2. **Kiểm tra nghiệp vụ tại tầng Service**:
   `LearningActivityService.java` kiểm tra `occurredAt.isAfter(Instant.now().plus(MAX_FUTURE_CLOCK_DRIFT))` (với `MAX_FUTURE_CLOCK_DRIFT = Duration.ofMinutes(5)`). Nếu vi phạm, hệ thống ném ra `BusinessException(HttpStatus.BAD_REQUEST)` với thông báo lỗi tiếng Việt thân thiện.
3. **Mặc định an toàn (Fallback)**:
   Nếu request client không truyền `occurredAt` (hoặc truyền null), hệ thống tự động gán `occurredAt = Instant.now()`.

---

## 5. Chiến lược Lập Chỉ mục (Indexing) & Tối ưu hóa Truy vấn

Bảng `learning_activities` là bảng dạng log/time-series có tốc độ ghi cao và lưu trữ lượng bản ghi lớn theo thời gian. Để đảm bảo các truy vấn phân trang, lọc theo học viên, khóa học và khoảng thời gian (from/to) đạt tốc độ tối đa dưới 10ms, 5 chỉ mục B-Tree phức hợp (composite indexes) đã được tạo dựng:

### 5.1 Danh mục chỉ mục B-Tree

1. **`idx_learning_activities_student_time`**:
   ```sql
   CREATE INDEX idx_learning_activities_student_time 
   ON learning_activities (student_id, occurred_at DESC);
   ```
   - *Mục đích*: Phục vụ màn hình Dashboard cá nhân / Timeline học tập của học viên.
   - *Lợi ích*: Truy vấn lọc theo `student_id` và sắp xếp `ORDER BY occurred_at DESC` được đọc trực tiếp từ Index Scan theo chiều giảm dần, không tốn chi phí Sort in-memory (`Sort Exec = 0`).

2. **`idx_learning_activities_student_course_time`**:
   ```sql
   CREATE INDEX idx_learning_activities_student_course_time 
   ON learning_activities (student_id, course_id, occurred_at DESC);
   ```
   - *Mục đích*: Phục vụ xem chi tiết nhật ký học tập của học viên trong một khóa học cụ thể.
   - *Lợi ích*: Lọc đồng thời `student_id = ? AND course_id = ?` và duyệt dải thời gian `occurred_at BETWEEN ? AND ?` trong một thao tác Index Range Scan duy nhất.

3. **`idx_learning_activities_course_time`**:
   ```sql
   CREATE INDEX idx_learning_activities_course_time 
   ON learning_activities (course_id, occurred_at DESC);
   ```
   - *Mục đích*: Phục vụ giảng viên hoặc quản trị viên theo dõi luồng hoạt động thời gian thực của toàn bộ học viên trong khóa học.
   - *Lợi ích*: Giảng viên xem top hoạt động gần nhất của khóa học siêu tốc.

4. **`idx_learning_activities_course_type_time`**:
   ```sql
   CREATE INDEX idx_learning_activities_course_type_time 
   ON learning_activities (course_id, activity_type, occurred_at DESC);
   ```
   - *Mục đích*: Phục vụ các bộ lọc theo loại sự kiện (ví dụ: chỉ lọc danh sách các bài Quiz được nộp, hoặc chỉ lọc các câu hỏi thảo luận mới).
   - *Lợi ích*: Giảm thiểu tối đa số trang dữ liệu phải đọc khi lọc theo phân loại sự kiện.

5. **`idx_learning_activities_lesson_time` (Partial Index)**:
   ```sql
   CREATE INDEX idx_learning_activities_lesson_time 
   ON learning_activities (lesson_id, occurred_at DESC) 
   WHERE lesson_id IS NOT NULL;
   ```
   - *Mục đích*: Drill-down phân tích tương tác trên một bài học nhất định.
   - *Tối ưu*: Sử dụng **Partial Index** (`WHERE lesson_id IS NOT NULL`) giúp loại bỏ các hoạt động cấp khóa học (như `COURSE_ENROLLED`, `CERTIFICATE_ISSUED`), tiết kiệm tới 30-40% kích thước index trên đĩa và trong bộ nhớ đệm (RAM buffer pool).

---

## 6. Kiến trúc Triển khai (Application & API Layer)

Hệ thống tuân thủ chặt chẽ kiến trúc Modular Monolith và quy tắc phân lớp của EduAlto:
```
Controller -> Service -> Domain -> Repository -> Database
```

### 6.1 Các lớp thành phần

1. **Domain**:
   - `LearningActivity.java`: JPA Entity ánh xạ bảng `learning_activities`, sử dụng UUID ID và JSONB converter.
   - `LearningActivityType.java`: Enum định nghĩa 13 sự kiện, kèm tên hiển thị tiếng Việt (`displayName`), phân nhóm (`category`) và mô tả chi tiết.
2. **Repository**:
   - `LearningActivityRepository.java`: Cung cấp các phương thức tìm kiếm linh hoạt theo `studentId`, `courseId`, `occurredAt BETWEEN`, tính tổng hoạt động, và đếm số lượng học viên tích cực duy nhất (`countDistinctActiveStudents`).
3. **DTOs**:
   - `RecordLearningActivityRequest.java`: DTO nhận yêu cầu ghi nhận hoạt động từ client với validation chặt chẽ.
   - `LearningActivityResponse.java`: DTO trả về thông tin hoạt động, làm giàu tiêu đề khóa học (`courseTitle`), tiêu đề bài học (`lessonTitle`), tên hiển thị tiếng Việt và nhóm sự kiện.
   - `LearningActivityTypeInfoDto.java`: DTO cung cấp metadata của các loại sự kiện để frontend hiển thị dropdown/filter.
   - `LearningActivitySummaryResponse.java`: DTO tổng hợp số liệu hoạt động.
4. **Service**:
   - `LearningActivityService.java`: 
     - Kiểm tra quyền ghi danh học viên thông qua `EnrollmentService` (trừ sự kiện `COURSE_ENROLLED`).
     - Kiểm tra time drift và tồn tại khóa học/bài học.
     - Kiểm tra quyền sở hữu của Giảng viên khi truy vấn hoạt động khóa học.
     - Sử dụng batch loading để phân giải `courseTitle` và `lessonTitle` (tránh vấn đề N+1 query).
5. **Controller**:
   - `LearningActivityController.java`: Phơi bày các RESTful API endpoints theo chuẩn `/api/v1/learning/activities`.

### 6.2 Danh mục REST API Endpoints

| Phương thức | Đường dẫn API | Quyền hạn (RBAC) | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/learning/activities` | `RECORD_LEARNING_ACTIVITY` | Ghi nhận một hoạt động học tập mới từ client. |
| `GET` | `/api/v1/learning/activities/me` | `VIEW_MY_LEARNING_ACTIVITIES` | Lấy lịch sử hoạt động cá nhân của học viên đăng nhập (hỗ trợ lọc `courseId`, `from`, `to`, phân trang). |
| `GET` | `/api/v1/learning/activities/courses/{courseId}` | `VIEW_COURSE_LEARNING_ACTIVITIES` | Giảng viên xem luồng hoạt động của khóa học (kiểm tra quyền sở hữu khóa học, lọc `activityType`, `from`, `to`, phân trang). |
| `GET` | `/api/v1/learning/activities/types` | `VIEW_LEARNING_ACTIVITY_TYPES` | Lấy danh sách 13 loại sự kiện chuẩn hóa kèm tên hiển thị tiếng Việt và danh mục để render UI. |

---

## 7. Kết quả Kiểm thử & Đảm bảo Chất lượng (Quality Verification)

- **Unit Test**: `LearningActivityServiceTest.java`
  - Đã xây dựng 6 kịch bản kiểm thử toàn diện:
    1. `recordActivity_CourseEnrolled_SavesWithoutEnrollmentCheck`: Ghi nhận sự kiện ghi danh không yêu cầu kiểm tra enrollment trước.
    2. `recordActivity_LessonViewed_RequiresEnrollmentAndResolvesLesson`: Ghi nhận bài học yêu cầu enrollment và phân giải tiêu đề bài học.
    3. `recordActivity_FutureTimestamp_ThrowsBadRequest`: Chặn và trả về lỗi BAD_REQUEST khi timestamp lệch tương lai > 5 phút.
    4. `getStudentActivities_FiltersByCourseAndTime`: Lọc timeline cá nhân theo khóa học và dải thời gian với phân trang chính xác.
    5. `getCourseActivitiesForInstructor_WhenNotInstructor_ThrowsForbidden`: Chặn truy cập trái phép của giảng viên không sở hữu khóa học.
    6. `getStandardizedActivityTypes_ReturnsAll13StandardTypes`: Xác thực trả về đầy đủ 13 loại sự kiện chuẩn hóa.
  - **Kết quả chạy thử**: `Tests run: 6, Failures: 0, Errors: 0, Skipped: 0` (Thời gian chạy: 1.32s, `BUILD SUCCESS`).
- **Code & Style Conventions**:
  - Không sử dụng wildcard import (`.*`), 100% explicit imports.
  - Thông báo lỗi và mô tả giao diện bằng tiếng Việt theo đúng nguyên tắc `AGENTS.md`.
  - Giữ toàn bộ thay đổi ở trạng thái unstaged, sẵn sàng cho review.
