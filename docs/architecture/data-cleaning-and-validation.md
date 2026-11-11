# Quy trình Làm sạch và Xác thực Dữ liệu Học thuật (Data Cleaning & Validation Pipeline)

- **Mã nhiệm vụ (Jira Ticket):** `EDU-100` (Epic: `EDU-101` - Phân hệ Phân tích dữ liệu & Trí tuệ nhân tạo)
- **Tiêu đề:** Thực hiện làm sạch và xác thực dữ liệu.
- **Ngôn ngữ triển khai:** Python 3.13 (`pandas`, `numpy`, `pyarrow`, `pytest`)
- **Tập tin thực thi chính:** [`scripts/data_pipeline/clean_and_validate_dataset.py`](../../scripts/data_pipeline/clean_and_validate_dataset.py)
- **Tập lệnh sinh dữ liệu mẫu:** [`scripts/data_pipeline/generate_raw_dataset.py`](../../scripts/data_pipeline/generate_raw_dataset.py)
- **Nguồn trích xuất thực từ DB (EDU-99):** [`scripts/academic_pipeline/pipeline.py`](../../scripts/academic_pipeline/pipeline.py)
- **Bộ kiểm thử tự động:** [`scripts/data_pipeline/test_data_pipeline.py`](../../scripts/data_pipeline/test_data_pipeline.py)
- **Báo cáo kết quả tự động:** [`data/DATASET_QUALITY_REPORT.md`](../../data/DATASET_QUALITY_REPORT.md)

---

## 1. Mục tiêu và Phạm vi Nhiệm vụ EDU-100

Trong hệ sinh thái EduAlto LMS, dữ liệu học tập thu thập từ học viên (điểm kiểm tra Quiz, bài tập Assignment, thời lượng xem video, thời gian đọc bài giảng TEXT, tần suất học tập) đến từ hai nguồn: tập dữ liệu thô tổng hợp từ pipeline ETL thực tế (`EDU-99`, `student_course_academic_summary.*` và thư mục `entities/` gồm `raw_quizzes.csv`, `raw_assignments.csv`, `raw_activities.csv`, ...) hoặc tập dữ liệu mô phỏng lỗi (`generate_raw_dataset.py`).

Nhiệm vụ **EDU-100** xây dựng quy trình chuẩn hóa và làm sạch dữ liệu tự động (`EduAltoDataCleaner`), kết nối trực tiếp đầu ra của **EDU-99** với 5 công đoạn chuẩn hóa:
1. **Xử lý missing values**: Thống kê, loại bỏ các bản ghi khuyết thiếu định danh bắt buộc (`student_id`), áp dụng kỹ thuật điền dữ liệu thông minh (*Intelligent Imputation*) theo trung vị nhóm cho các cột số.
2. **Kiểm tra dữ liệu bất thường (Anomalies & Outliers)**: Phát hiện và chặn trần/chặn sàn theo biên logic học thuật ($0 \le \text{điểm} \le \text{max\_score}$, thời lượng học $> 0$, tiến độ hoàn thành $\le \text{tổng bài}$) và loại trừ ngoại lai thống kê bằng phương pháp khoảng tứ phân vị (IQR).
3. **Chuẩn hóa thang điểm (Score Normalization)**: Đồng bộ tất cả các loại hình đánh giá (Quiz thang 100, Assignment thang 10/50/100, Midterm, Final Project, Course Overall) về **Thang điểm 10 chuẩn học thuật Việt Nam** $[0.0, 10.0]$, **Thang điểm chuẩn hóa Min-Max** $[0.0, 1.0]$ cho Machine Learning, và tự động xếp loại học lực (*Xuất sắc, Giỏi, Khá, Trung bình, Yếu*).
4. **Kiểm tra dữ liệu trùng lặp (Duplicate Detection)**: Loại bỏ trùng lặp hoàn toàn (*Exact Duplicates* do click đúp) và xử lý trùng lặp nộp bài nhiều lần (*Semantic Duplicates*) theo chính sách **Best Score Policy** (ưu tiên điểm hợp lệ trong khung `[0, max_score]` quy đổi tỷ lệ trước) hoặc **Latest Policy**.
5. **Tạo báo cáo chất lượng dataset**: Tự động sinh báo cáo kiểm toán chất lượng (*Data Quality & Profiling Report*) chi tiết về chế độ nguồn (`source_mode`), kích thước mẫu trước/sau, chỉ số tín hiệu học tập tích hợp từ `learning_activities` (khi có), phân phối thống kê và bảng kiểm định toàn vẹn dữ liệu.

---

## 2. Kiến trúc Module Pipeline & Kết nối EDU-99

```mermaid
flowchart TD
    SyntheticRaw["Dữ liệu thô mô phỏng\n(data/raw_learning_dataset.csv)"]
    Edu99Summary["EDU-99 Summary Export\n(student_course_academic_summary.csv / .parquet / .json / .jsonl)"]
    Edu99Entities["EDU-99 Raw Entities\n(entities/raw_quizzes.csv, raw_assignments.csv, raw_activities.csv, ...)"]

    subgraph Pipeline ["EduAltoDataCleaner Pipeline (clean_and_validate_dataset.py)"]
        Adapter["0. Adapter & Auto-Detection\n(synthetic | academic-summary | academic-entities)"]
        Step1["1. Kiểm tra & Loại bỏ trùng lặp\n(Exact duplicates & Semantic Best Score / Latest)"]
        Step2["2. Xử lý Missing Values\n(Drop missing IDs + Median Imputation)"]
        Step3["3. Xử lý Ngoại lai & Bất thường\n(Logic boundaries + IQR Capping)"]
        Step4["4. Chuẩn hóa thang điểm\n(Thang 10, Thang 100, Min-Max [0,1], Xếp loại)"]
        Step5["5. Khởi tạo Báo cáo Chất lượng\n(Data Quality Report & Integrity Checks)"]

        Adapter --> Step1 --> Step2 --> Step3 --> Step4 --> Step5
    end

    CleanData["Dataset đã chuẩn hóa\n(cleaned_learning_dataset.csv / .parquet)"]
    Report["Báo cáo chất lượng\n(data/DATASET_QUALITY_REPORT.md)"]

    SyntheticRaw --> Adapter
    Edu99Summary --> Adapter
    Edu99Entities --> Adapter
    Step4 --> CleanData
    Step5 --> Report
```

---

## 3. Đặc tả 5 Công đoạn Xử lý Kỹ thuật

### 3.1. Nhiệm vụ 4: Kiểm tra và Loại bỏ Trùng lặp
- **Trùng lặp dòng hoàn toàn (Exact Duplicates):** Phát hiện qua tập thuộc tính nội dung `(student_id, course_id, assessment_id, raw_score, submitted_at)`. Các dòng trùng lặp phát sinh do lỗi gửi kép HTTP request sẽ bị loại bỏ ngay lập tức.
- **Trùng lặp nộp bài nhiều lần (Semantic Duplicates):** Nhóm theo bộ khóa `(student_id, course_id, assessment_id)`. Áp dụng thuật toán sắp xếp giảm dần theo `raw_score` và giữ lại bản ghi có điểm số cao nhất (`keep='first'`), bảo vệ quyền lợi thành tích học tập của học viên.

### 3.2. Nhiệm vụ 1: Xử lý Giá trị Khuyết thiếu (Missing Values)
- **Quy tắc loại bỏ (Drop Policy):** Các dòng bị thiếu `student_id` (trị giá `null`, `NaN` hoặc chuỗi rỗng) lập tức bị loại bỏ do vi phạm tính toàn vẹn định danh học thuật.
- **Quy tắc điền dữ liệu (Imputation Policy):**
  - Cột `raw_score`: Điền bằng giá trị trung vị (*Median*) của cùng loại bài đánh giá trong cùng khóa học. Gắn cờ `score_was_imputed = True` để phục vụ truy vết kiểm toán.
  - Cột `time_spent_minutes`: Điền theo trung vị thời lượng của loại bài đánh giá tương ứng.
  - Cột `study_frequency_per_week`: Điền theo trung vị toàn hệ thống.
  - Cột `completed_lessons_count`: Điền theo trung vị tiến độ của khóa học tương ứng.

### 3.3. Nhiệm vụ 2: Kiểm tra Dữ liệu Bất thường (Anomalies & Outliers)
- **Hiệu chỉnh biên logic:**
  - $\text{raw\_score} < 0 \implies \text{raw\_score} = 0.0$
  - $\text{raw\_score} > \text{max\_score} \implies \text{raw\_score} = \text{max\_score}$
  - $\text{time\_spent\_minutes} \le 0 \implies \text{time\_spent\_minutes} = \text{median\_time}$
  - $\text{completed\_lessons} > \text{total\_lessons} \implies \text{completed\_lessons} = \text{total\_lessons}$
- **Xử lý ngoại lai thời lượng (Session Hanging Timeout):**
  - Xác định ngưỡng trần theo khoảng tứ phân vị: $\text{Upper Bound} = \min(Q_3 + 3.0 \times \text{IQR}, 720.0 \text{ phút})$.
  - Cắt trần (Winsorization/Capping) tại ngưỡng này để tránh làm lệch các phép tính thời lượng trung bình.

### 3.4. Nhiệm vụ 3: Chuẩn hóa Thang điểm (Score Normalization)
- **Thang điểm 10 học thuật Việt Nam:**
  $$\text{score\_scale\_10} = \operatorname{round}\left(\frac{\text{raw\_score}}{\text{max\_score}} \times 10.0, 2\right)$$
- **Thang điểm 100:**
  $$\text{score\_scale\_100} = \operatorname{round}\left(\frac{\text{raw\_score}}{\text{max\_score}} \times 100.0, 2\right)$$
- **Thang chuẩn hóa Min-Max $[0.0, 1.0]$ cho AI/ML:**
  $$\text{score\_normalized\_0\_1} = \operatorname{round}\left(\frac{\text{raw\_score}}{\text{max\_score}}, 4\right)$$
- **Quy tắc phân loại học lực (Academic Ranking):**
  - $\text{score\_scale\_10} \ge 9.0 \implies \text{Xuất sắc}$
  - $8.0 \le \text{score\_scale\_10} < 9.0 \implies \text{Giỏi}$
  - $6.5 \le \text{score\_scale\_10} < 8.0 \implies \text{Khá}$
  - $5.0 \le \text{score\_scale\_10} < 6.5 \implies \text{Trung bình}$
  - $\text{score\_scale\_10} < 5.0 \implies \text{Yếu}$

### 3.5. Nhiệm vụ 5: Tạo Báo cáo Chất lượng Dataset
- Khởi tạo file Markdown độc lập tại [`data/DATASET_QUALITY_REPORT.md`](../../data/DATASET_QUALITY_REPORT.md).
- Ghi nhận rõ chế độ nguồn dữ liệu (`synthetic`, `academic-summary`, `academic-entities`) và thống kê tín hiệu học tập từ `learning_activities` khi chạy với nguồn `EDU-99`.
- Trình bày bảng so sánh trước và sau khi làm sạch (*Before vs. After*).
- Thống kê tỷ lệ đỗ (*Pass rate*), phân vị $Q_1, Q_2, Q_3$, độ lệch chuẩn và phân phối xếp loại.
- Bảng tự động kiểm định 5 tiêu chuẩn toàn vẹn (*Completeness, Validity, Uniqueness, Consistency, AI Readiness*).

---

## 4. Hướng dẫn Khởi chạy và Kiểm thử

### 4.1. Khởi chạy toàn bộ Pipeline
```bash
# 1a. Sinh dữ liệu thô mẫu (khi chạy kịch bản synthetic)
.venv/bin/python scripts/data_pipeline/generate_raw_dataset.py
.venv/bin/python scripts/data_pipeline/clean_and_validate_dataset.py

# 1b. Khởi tạo cohort 300 học viên (khi cần dữ liệu phong phú trong DB dev) -> EDU-99 -> EDU-100
# (Thêm --reference-now / --reference-time cùng 1 mốc UTC nếu cần cả team tái lập giống hệt từng timestamp)
.venv/bin/python scripts/data_pipeline/seed_dev_cohort.py --students 300 --seed 42
.venv/bin/python scripts/run_academic_pipeline.py --mode full --export-entities
.venv/bin/python scripts/data_pipeline/clean_and_validate_dataset.py \
    --input data/academic_exports/student_course_academic_summary.parquet \
    --entities-dir data/academic_exports/entities \
    --source academic-entities \
    --output data/cleaned_learning_dataset.csv \
    --report data/DATASET_QUALITY_REPORT.md
```

### 4.2. Chạy bộ kiểm thử tự động (Unit & Integration Tests)
```bash
.venv/bin/python -m pytest scripts/data_pipeline/test_data_pipeline.py scripts/data_pipeline/test_seed_dev_cohort.py -v
```

Các kịch bản kiểm thử tự động bao gồm:
- `test_remove_duplicates` & `test_remove_duplicates_best_score_prefers_valid_over_outlier_and_normalizes_scale`
- `test_handle_missing_values`
- `test_detect_and_handle_anomalies`
- `test_normalize_scores`
- `test_full_pipeline_end_to_end`
- `test_edu99_summary_and_entities_connect_to_edu100_e2e` (kết nối toàn trình `AcademicPipeline` -> `EduAltoDataCleaner` qua cả `.parquet` summary và thư mục `entities/`)
- `test_cleaner_handles_empty_and_all_nan_sparse_dataframe`
