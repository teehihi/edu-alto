# TỔNG KẾT TRIỂN KHAI TÍNH NĂNG & DỮ LIỆU NỀN TẢNG EDUALTO

Tài liệu này ghi lại chi tiết toàn bộ các công việc, tính năng và dữ liệu đã được triển khai, chuẩn hóa và kiểm thử toàn diện trên nền tảng học tập trực tuyến EduAlto, bao gồm 3 phân hệ trọng tâm:

1. **Bảng điều khiển phân tích số liệu học tập và doanh thu cho giảng viên (Instructor Analytics Dashboard - EDU-48 / EDU-15)**:
   - Trực quan hóa số lượng học viên đăng ký mới, tỷ lệ hoàn thành khóa học và doanh thu từng tháng.
   - Hệ thống thẻ KPI tổng hợp, biểu đồ trực quan đa chế độ xem, bộ lọc theo khóa học và xuất báo cáo CSV.
2. **Khảo sát và phân tích các nguồn dữ liệu học thuật hiện có (Academic Data Sources Analysis - EDU-96 / EDU-101)**:
   - Khảo sát chuyên sâu cơ sở dữ liệu PostgreSQL (Flyway `V1` $\to$ `V33`).
   - Phân tích 6 nguồn dữ liệu: `enrollment`, `grades`, `quizzes`, `assignments`, `attendance` (hiện diện số), `course progress`.
   - Thiết kế sơ đồ quan hệ thực thể học thuật (ERD) giữa Student, Course, Lesson, Assessment.
   - Xây dựng ma trận đánh giá mức độ đầy đủ dữ liệu cho Machine Learning (ML Readiness Matrix).
3. **Thu thập hoạt động học tập & Pipeline dữ liệu học thuật (Learning Activity Tracking & Academic Data Pipeline - EDU-97, EDU-98, EDU-99, EDU-100 / EDU-101)**:
   - Thiết kế bảng CSDL `learning_activities` (Flyway `V34`) ghi nhận đa dạng các sự kiện học tập thời gian thực (Heartbeat video, làm bài kiểm tra, nộp bài tập, thảo luận).
   - Xây dựng backend `LearningActivityService`, REST API và cơ chế đồng bộ tự động.
   - Tích hợp frontend Heartbeat tracking tại trình phát bài giảng `learning-lesson-page.tsx`.
   - Xây dựng bộ công cụ Python ETL Pipeline trích xuất, làm sạch, chuẩn hóa điểm số và phát hiện ngoại lai (`clean_and_validate_dataset.py`, `run_academic_pipeline.py`).

---

## 1. Chi tiết Nghiệp vụ & Kiến trúc Triển khai

### 1.1. Bảng điều khiển phân tích số liệu học tập và doanh thu cho giảng viên (EDU-48)
- **Mục tiêu nghiệp vụ:** Cung cấp cho giảng viên bức tranh toàn diện và trực quan nhất về hiệu quả kinh doanh và chất lượng học tập của toàn bộ các khóa học đang giảng dạy trong 12 tháng gần nhất.
- **Backend (`com.edualto.analytics`):**
  - **DTOs chuẩn hóa:**
    - `InstructorMonthlyTrendDto`: Lưu trữ dữ liệu từng tháng (`month`, `label`, `newEnrollments`, `completedCount`, `revenue`, `completionRate`).
    - `InstructorAnalyticsSummaryDto`: Tổng hợp KPI (Tổng doanh thu, doanh thu tháng này, tổng học viên, học viên mới tháng này, tỷ lệ hoàn thành trung bình %, chứng chỉ đã cấp).
    - `InstructorCoursePerformanceDto`: Báo cáo chi tiết theo từng khóa học (số học viên, bài học hoàn thành, tỷ lệ hoàn thành %, doanh thu, điểm đánh giá).
    - `InstructorAnalyticsOverviewResponse`: Payload thống nhất cho dashboard.
  - **Repository & Truy vấn SQL:**
    - Sử dụng PostgreSQL `generate_series` tạo chuỗi 12 tháng liên tục theo múi giờ `Asia/Ho_Chi_Minh`.
    - Kết hợp dữ liệu từ `enrollments`, `learning_progress`, `certificates`, `orders`, `order_items`, `payments` và `course_reviews`.
    - Hỗ trợ lọc tổng quan toàn sàn hoặc lọc chi tiết theo từng khóa học cụ thể (`courseId`).
  - **Service & Bảo mật:**
    - `InstructorAnalyticsService`: Xác thực vai trò giảng viên hoạt động (`requireActiveInstructor`), kiểm tra quyền sở hữu khóa học (`ownsCourse`), tính toán tỷ lệ hoàn thành có trọng số.
  - **REST API:**
    - `GET /api/v1/instructor/analytics/overview` (hỗ trợ query param `courseId`).
    - `GET /api/v1/instructor/analytics/courses/{courseId}`.
- **Frontend (`features/instructor/instructor-analytics-page.tsx`):**
  - Route riêng biệt `/instructor/analytics` với title và SEO metadata "Phân tích số liệu học tập và doanh thu".
  - **4 khối thẻ KPI tổng hợp:** Doanh thu tích lũy, Học viên đăng ký, Tỷ lệ hoàn thành khóa học, Chứng chỉ đã cấp kèm chỉ số biến động trong tháng hiện tại.
  - **Biểu đồ cột trực quan hóa:** So sánh số lượng học viên đăng ký mới và số lượng học viên hoàn thành (cấp chứng chỉ) trong 12 tháng, tooltip tương tác chi tiết khi rê chuột.
  - **Biểu đồ miền doanh thu:** Đường cong doanh thu theo tháng với dải màu gradient EduAlto (`#20B486`), định dạng tiền tệ VND chuẩn Việt Nam.
  - **Tab chuyển đổi góc nhìn:** Cho phép xem tổng hợp tất cả chỉ số hoặc lọc riêng từng biểu đồ (Học viên mới, Doanh thu, Tỷ lệ hoàn thành).
  - **Bảng thống kê hiệu quả từng khóa học:** Chi tiết từng khóa học kèm trạng thái (Bản nháp, Đang xuất bản, Đã lưu trữ), giá bán, số học viên, thanh tiến độ hoàn thành (%), số chứng chỉ, doanh thu và đánh giá sao.
  - **Xuất báo cáo CSV:** Cho phép xuất toàn bộ dữ liệu 12 tháng và chi tiết khóa học ra tệp tin CSV có gắn tiền tố UTF-8 BOM (`\uFEFF`) chống lỗi font tiếng Việt trong Excel.
  - **Tích hợp Workspace Shell & Dashboard:** Bổ sung mục "Phân tích & Thống kê" vào sidebar điều hướng và nút "Phân tích số liệu" tại tiêu đề trang tổng quan `/instructor`.

---

### 1.2. Phân tích các nguồn dữ liệu học thuật hiện có (EDU-96)
- **Mục tiêu nghiên cứu:** Rà soát toàn bộ cấu trúc CSDL EduAlto, xác định quan hệ thực thể và đánh giá mức độ sẵn sàng dữ liệu phục vụ huấn luyện các mô hình Machine Learning & AI trong EdTech.
- **Khảo sát 6 nguồn dữ liệu học thuật:**
  1. `enrollment`: Bảng `enrollments` (`student_id`, `course_id`, `status`, `enrolled_at`) xác định mốc thời gian bắt đầu học ($T_0$) và cohort học viên.
  2. `grades`: Điểm formative qua `quiz_attempts.score` (thang 0-100), `passed`, chi tiết `quiz_attempt_answers.is_correct` và điểm summative qua `assignment_submissions.score`, `feedback`.
  3. `quizzes`: Cấu trúc `quizzes`, `quiz_questions`, `quiz_options`, phiên thi `quiz_attempt_sessions` và tín hiệu giám sát hành vi `quiz_attempt_activity_events` (`TAB_HIDDEN`, `COPY`, `PASTE`).
  4. `assignments`: Đề bài `assignments` (`due_at`, `max_score`), bài nộp văn bản của học viên `assignment_submissions.response_text` phục vụ bài toán NLP/LLM.
  5. `attendance` (Hiện diện số): Đo lường sự chuyên cần qua dấu vết số: timestamp `learning_progress.completed_at`, lịch học `calendar_events`, thời lượng phiên làm quiz, và ghi chú theo giây video `learning_notes.video_second`.
  6. `course progress`: Tiến độ `learning_progress` ($\frac{\text{CompletedLessons}}{\text{TotalLessons}} \times 100\%$) và mốc tốt nghiệp `certificates.issued_at`.
- **Sơ đồ quan hệ thực thể học thuật (Academic ERD):**
  - Mô hình hóa đầy đủ quan hệ giữa Student (`users`), Course, Section, Lesson, Quiz, QuizAttempt, Assignment, AssignmentSubmission, Progress và Certificate.
- **Đánh giá mức độ sẵn sàng cho Machine Learning (ML Readiness Matrix):**
  - *Dự báo nguy cơ bỏ học (Drop-out Prediction):* **7.5 / 10** (Sẵn sàng triển khai Baseline Logistic Regression, Random Forest, XGBoost).
  - *Mô hình hóa năng lực kiến thức (Knowledge Tracing - BKT/DKT):* **5.5 / 10** (Cần bổ sung taxonomy kỹ năng gắn với câu hỏi quiz).
  - *Hệ thống gợi ý bài học cá nhân hóa (Learning-to-Rank):* **6.0 / 10** (Cần bổ sung log hiển thị gợi ý để có nhãn âm huấn luyện ranker).
  - *Chấm bài tự luận tự động (Automated Essay Scoring & LLM):* **7.0 / 10** (Sẵn sàng cho Few-shot LLM Prompting).
- **Tài liệu lưu trữ:** [`docs/architecture/edu-96-academic-data-sources-analysis.md`](file:///c:/edu-alto/docs/architecture/edu-96-academic-data-sources-analysis.md).

---

### 1.3. Thu thập hoạt động học tập & Pipeline dữ liệu học thuật (EDU-97 -> EDU-100)
- **Bảng CSDL `learning_activities` (Flyway `V34__learning_activities.sql`):**
  - Lưu vết các sự kiện tương tác chi tiết: `LESSON_START`, `LESSON_COMPLETE`, `VIDEO_PLAY`, `VIDEO_PAUSE`, `VIDEO_HEARTBEAT`, `QUIZ_START`, `QUIZ_SUBMIT`, `ASSIGNMENT_SUBMIT`, `DISCUSSION_POST`, `NOTE_TAKE`.
  - Các trường dữ liệu: `id`, `user_id`, `course_id`, `section_id`, `lesson_id`, `activity_type`, `duration_seconds`, `progress_percent`, `metadata` (JSONB), `occurred_at`.
- **Backend & Hook nghiệp vụ:**
  - `LearningActivityService` và `LearningActivityController` (`/api/v1/learning/activities`).
  - Tự động ghi nhận activity khi hoàn thành bài học (`LearningService`), nộp quiz (`QuizService`), nộp bài tập (`AssignmentService`).
- **Frontend Tracking Heartbeat:**
  - `learning-lesson-page.tsx`: Gửi tín hiệu Heartbeat định kỳ khi học viên xem video hoặc đọc bài giảng, lưu vết thời gian xem thực tế (Dwell Time).
- **Pipeline làm sạch & Chuẩn hóa dữ liệu (`scripts/data_pipeline/`):**
  - Kịch bản `clean_and_validate_dataset.py`:
    - Loại bỏ trùng lặp bản ghi và xử lý nộp trùng (Semantic duplicates - Best Score Policy).
    - Xử lý giá trị khuyết thiếu (Imputation theo Median nhóm).
    - Chuẩn hóa và chặn trần ngoại lai (IQR capping cho thời gian học, chặn điểm âm / điểm vượt khung).
    - Chuẩn hóa điểm số đa hình thức về Thang điểm 10 Việt Nam và Thang điểm [0.0, 1.0].
  - Báo cáo chất lượng dataset tại `data/DATASET_QUALITY_REPORT.md` đạt **100% ĐẠT CHUẨN (VERIFIED & CLEANED)**.

---

## 2. Danh mục Tệp tin Triển khai & Cập nhật

### 2.1. Backend (Java / Spring Boot / PostgreSQL)
- `backend/src/main/resources/db/migration/V34__learning_activities.sql` *(Tạo mới)*: CSDL theo dõi hoạt động học tập.
- `backend/src/main/java/com/edualto/analytics/controller/InstructorAnalyticsController.java` *(Tạo mới)*: REST API phân tích số liệu giảng viên.
- `backend/src/main/java/com/edualto/analytics/dto/` *(Tạo mới)*: Bộ 4 DTOs tổng hợp doanh thu, học viên, tỷ lệ hoàn thành và hiệu quả khóa học.
- `backend/src/main/java/com/edualto/analytics/repository/InstructorAnalyticsRepository.java` *(Tạo mới)*: Repository SQL tổng hợp số liệu 12 tháng.
- `backend/src/main/java/com/edualto/analytics/service/InstructorAnalyticsService.java` *(Tạo mới)*: Dịch vụ phân tích số liệu giảng viên.
- `backend/src/test/java/com/edualto/analytics/InstructorAnalyticsServiceTest.java` *(Tạo mới)*: Unit test cho Analytics Service.
- `backend/src/main/java/com/edualto/learning/domain/` & `dto/`: Domain entity, Enum và DTOs cho `LearningActivity`.
- `backend/src/main/java/com/edualto/learning/service/LearningActivityService.java` *(Tạo mới)*: Dịch vụ ghi nhận và đồng bộ hoạt động học tập.
- `backend/src/main/java/com/edualto/learning/controller/LearningActivityController.java` *(Tạo mới)*: REST API theo dõi hoạt động.
- `backend/src/test/java/com/edualto/learning/LearningActivityServiceTest.java` *(Tạo mới)*: Unit test cho Learning Activity Service.
- Các cập nhật tích hợp hook: `AssignmentService.java`, `LearningService.java`, `QuizService.java`.

### 2.2. Frontend (Next.js 16 / TypeScript / React / Tailwind CSS)
- `frontend/src/app/instructor/analytics/page.tsx` *(Tạo mới)*: Trang route Bảng điều khiển phân tích số liệu.
- `frontend/src/features/instructor/instructor-analytics-page.tsx` *(Tạo mới)*: Component giao diện biểu đồ và thống kê chi tiết.
- `frontend/src/features/instructor/instructor-analytics-page.test.tsx` *(Tạo mới)*: Bộ kiểm thử component tự động cho trang phân tích.
- `frontend/src/lib/instructor-analytics-client.ts` *(Tạo mới)*: API client gọi dịch vụ phân tích số liệu.
- `frontend/src/features/instructor/instructor-workspace-shell.tsx`: Bổ sung mục "Phân tích & Thống kê" vào sidebar.
- `frontend/src/features/instructor/instructor-dashboard-page.tsx`: Bổ sung liên kết nhanh tới trang phân tích.
- `frontend/src/features/learning/learning-lesson-page.tsx`: Tích hợp video heartbeat tracking.
- `frontend/src/lib/learning-client.ts`: Bổ sung API client gửi learning activity.

### 2.3. Tài liệu Kỹ thuật & Pipeline Scripts
- `docs/architecture/edu-96-academic-data-sources-analysis.md` *(Tạo mới)*: Báo cáo khảo sát nguồn dữ liệu học thuật và đánh giá ML readiness.
- `docs/architecture/academic-data-pipeline.md` *(Tạo mới)*: Tài liệu kiến trúc luồng dữ liệu học thuật.
- `docs/architecture/data-cleaning-and-validation.md` *(Tạo mới)*: Quy trình làm sạch và xác thực dữ liệu.
- `docs/database/learning-activity-schema-design.md` *(Tạo mới)*: Thiết kế chi tiết CSDL bảng hoạt động học tập.
- `scripts/academic_pipeline/`: Bộ công cụ Python trích xuất và tổng hợp dữ liệu học thuật.
- `scripts/data_pipeline/`: Bộ công cụ Python làm sạch, xác thực và xuất dataset.
- `data/DATASET_QUALITY_REPORT.md` & `cleaned_learning_dataset.csv`: Báo cáo nghiệm thu chất lượng dữ liệu sạch.

---

## 3. Kết quả Kiểm thử Toàn diện (Quality Gates)

| Bước kiểm tra | Công cụ thực hiện | Tiêu chuẩn chất lượng | Kết quả |
|---|---|---|:---:|
| **1. Lint siêu tốc** | `Oxlint` | 0 Error, 0 Warning | **100% ĐẠT (0 error, 0 warning)** |
| **2. Định dạng code** | `Oxfmt` | Đúng format chuẩn toàn bộ file | **100% ĐẠT** |
| **3. Kiểm tra kiểu TypeScript** | `tsc --noEmit` | 0 lỗi kiểu dữ liệu | **100% ĐẠT (0 error)** |
| **4. Unit & Component Test Frontend** | `Vitest` | Kiểm thử thành công các component | **100% ĐẠT** |
| **5. Unit Test Backend** | `Maven / JUnit 5` | Kiểm thử logic nghiệp vụ Service | **100% ĐẠT** |
