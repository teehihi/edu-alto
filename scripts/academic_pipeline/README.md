# Quy trình Trích xuất Dữ liệu Học thuật EduAlto (Academic Data Extraction Pipeline)

Hệ thống trích xuất và tổng hợp dữ liệu học thuật tự động (ETL / Learning Analytics Pipeline) cho nền tảng học tập trực tuyến **EduAlto**. Pipeline được xây dựng hoàn toàn bằng **Python**, hỗ trợ trích xuất toàn diện từ cơ sở dữ liệu PostgreSQL, tổng hợp chỉ số học tập theo từng cặp **Sinh viên & Môn học** (Student-Course Academic Profile), đồng thời hỗ trợ cơ chế **Trích xuất gia tăng (Incremental Extraction)** tối ưu tài nguyên và hiệu năng cao.

---

## 1. Mục tiêu & Nghiệp vụ cốt lõi

1. **Trích xuất dữ liệu từ PostgreSQL**:
   - Kết nối trực tiếp tới cơ sở dữ liệu PostgreSQL của EduAlto (`edualto`) thông qua cấu hình `.env` hoặc tham số môi trường.
   - Sử dụng transaction chỉ đọc (`READ ONLY`) và kiểm soát query timeout nhằm bảo vệ cơ sở dữ liệu vận hành (production / RDS t4g.micro), không gây nghẽn kết nối của hệ thống LMS.
   - Trích xuất toàn diện 10 thực thể dữ liệu học tập:
     - Người dùng & Sinh viên (`users`)
     - Khóa học & Giáo trình (`courses`, `sections`, `lessons`)
     - Ghi danh học tập (`enrollments`)
     - Tiến độ hoàn thành bài học (`learning_progress`)
     - Bài kiểm tra trắc nghiệm & Kết quả làm bài (`quizzes`, `quiz_attempts`)
     - Bài tập tự luận & Điểm chấm (`assignments`, `assignment_submissions`)
     - Thảo luận, Hỏi đáp mốc video & Bình luận (`discussions`, `discussion_comments`)
     - Cấp chứng chỉ điện tử hoàn thành (`certificates`)
     - Đánh giá & Phản hồi khóa học (`course_reviews`)
     - Ghi chú học tập cá nhân (`learning_notes`)

2. **Tổng hợp dữ liệu theo Sinh viên và Môn học (Student-Course Aggregation)**:
   - Đơn vị tổng hợp cơ sở: Cặp khóa chính `(student_id, course_id)`.
   - Tính toán tập chỉ số học thuật đa chiều phục vụ giám sát học vụ, báo cáo đào tạo và làm dữ liệu nguồn (Feature Store) cho các mô hình AI/ML (Hệ thống gợi ý khóa học / ranker, dự báo nguy cơ bỏ học / Early-Warning System, theo dõi kiến thức / Knowledge Tracing):
     - **Chỉ số Tiến độ**: Tổng số bài học, số bài hoàn thành, tỷ lệ hoàn thành (`lesson_completion_rate_pct`), thời lượng học thực tế.
     - **Chỉ số Trắc nghiệm**: Số quiz đã làm, số quiz đạt (`passed`), điểm trung bình, điểm cao nhất, độ chính xác câu trả lời (`quiz_accuracy_pct`).
     - **Chỉ số Bài tập**: Tỷ lệ nộp bài tập, điểm trung bình %, số bài nộp đúng hạn / quá hạn, tỷ lệ đúng hạn (`on_time_submission_rate_pct`).
     - **Chỉ số Tương tác & Gắn kết**: Số lượng câu hỏi thảo luận, số câu hỏi gắn mốc thời gian video, số bình luận đóng góp, số ghi chú cá nhân, đánh giá sao.
     - **Văn bằng & Hoàn thành**: Trạng thái hoàn thành khóa học, mã số chứng chỉ (`certificate_number`), thời điểm cấp chứng chỉ.
     - **Chỉ số Hoạt động & Nguy cơ**: Mốc hoạt động đầu tiên, mốc hoạt động gần nhất, số ngày không hoạt động (`days_since_last_activity`), cờ `is_inactive`.
     - **Điểm gắn kết tổng hợp (`academic_engagement_score`)**: Điểm chuẩn hóa từ 0 - 100 điểm dựa trên trọng số tiến độ (40%), trắc nghiệm (25%), bài tập (20%) và tương tác học tập (15%).
     - **Phân loại học lực (`academic_status`)**: `COMPLETED`, `EXCELLING`, `ON_TRACK`, `AT_RISK`, `JUST_STARTED`.

3. **Cơ chế Trích xuất Gia tăng (Incremental Extraction)**:
   - Theo dõi mốc thời gian trích xuất (`watermark` / `last_extracted_at`) thông qua tệp checkpoint trạng thái (`.pipeline_state.json`) với cơ chế ghi nguyên tử (Atomic write).
   - Trong chế độ gia tăng:
     - Pipeline chỉ quét các bản ghi mới hoặc có cập nhật (`updated_at > watermark`) trên toàn bộ các bảng nghiệp vụ.
     - Tự động nhận diện danh sách các cặp `(student_id, course_id)` bị ảnh hưởng bởi thay đổi.
     - Nếu không có hoạt động mới: Pipeline kết thúc tức thì trong vài mili-giây với trạng thái `UP_TO_DATE`, không tốn tài nguyên.
     - Nếu có thay đổi: Pipeline chỉ trích xuất và tính toán lại cho các cặp sinh viên - môn học tương ứng, sau đó tự động **hợp nhất (merge/upsert)** vào tập dữ liệu lịch sử tổng thể.
     - Cập nhật watermark mới chỉ khi toàn bộ quy trình hoàn tất thành công.

4. **Đa dạng định dạng xuất dữ liệu (Multi-Format Export & Mart Table)**:
   - **CSV**: Tương thích Excel, báo cáo quản trị (`student_course_academic_summary.csv`).
   - **JSON / JSONL**: Dễ dàng tích hợp API, Data Lake hoặc streaming ETL.
   - **Apache Parquet**: Định dạng cột tối ưu nén, đọc siêu tốc cho Pandas, Polars, Google Colab và PySpark.
   - **PostgreSQL Mart Table (Tùy chọn)**: Hỗ trợ tự động upsert trực tiếp vào bảng `academic_student_course_metrics` trên PostgreSQL qua cờ `--save-to-db`.

---

## 2. Cấu trúc thư mục

```text
scripts/
├── run_academic_pipeline.py           # Script launcher tiện ích tại thư mục gốc scripts
└── academic_pipeline/                 # Module pipeline cốt lõi
    ├── __init__.py                    # Khai báo package & phiên bản
    ├── config.py                      # Quản lý cấu hình & nạp biến môi trường .env
    ├── db.py                          # Kết nối cơ sở dữ liệu PostgreSQL & kiểm tra kết nối
    ├── state.py                       # Quản lý checkpoint watermark & ghi trạng thái an toàn
    ├── extractors.py                  # Các câu truy vấn SQL trích xuất dữ liệu học thuật
    ├── aggregators.py                 # Động cơ tổng hợp chỉ số học tập theo sinh viên & môn học
    ├── exporters.py                   # Xuất dữ liệu đa định dạng (CSV, JSON, Parquet, DB upsert)
    ├── pipeline.py                    # Bộ điều phối quy trình (Orchestrator: Full & Incremental)
    ├── cli.py                         # Giao diện dòng lệnh (CLI) với đầy đủ tùy chọn
    └── tests/                         # Bộ kiểm thử tự động toàn diện
        ├── __init__.py
        ├── conftest.py                # Schema SQLite giả lập & fixtures
        ├── test_config_and_state.py   # Kiểm thử cấu hình & checkpoint watermark
        ├── test_aggregators.py        # Kiểm thử tính toán chỉ số & hợp nhất gia tăng
        └── test_pipeline_e2e.py       # Kiểm thử trọn vẹn vòng đời Full -> Incremental
```

---

## 3. Hướng dẫn sử dụng

### 3.1. Xem trợ giúp dòng lệnh
```powershell
python scripts/run_academic_pipeline.py --help
```

### 3.2. Kiểm tra kết nối cơ sở dữ liệu PostgreSQL
```powershell
python scripts/run_academic_pipeline.py --test-connection
```

### 3.3. Xem trạng thái Checkpoint & Lịch sử chạy
```powershell
python scripts/run_academic_pipeline.py --status
```

### 3.4. Chạy trích xuất toàn bộ từ đầu (Full Refresh / Backfill)
```powershell
python scripts/run_academic_pipeline.py --mode full
```

### 3.5. Chạy trích xuất gia tăng (Incremental Extraction - Khuyến nghị cho Cron Job)
```powershell
python scripts/run_academic_pipeline.py --mode incremental
```

### 3.6. Chạy thử nghiệm không ghi tệp (Dry-run mode)
```powershell
python scripts/run_academic_pipeline.py --mode incremental --dry-run
```

### 3.7. Lưu dữ liệu tổng hợp trực tiếp vào bảng cơ sở dữ liệu PostgreSQL
```powershell
python scripts/run_academic_pipeline.py --mode incremental --save-to-db
```

### 3.8. Chỉ định thời điểm watermark tùy biến
```powershell
python scripts/run_academic_pipeline.py --mode incremental --since 2026-11-01T00:00:00Z
```

### 3.9. Reset lại trạng thái Checkpoint
```powershell
python scripts/run_academic_pipeline.py --reset-state
```

---

## 4. Kiểm thử tự động (Unit & Integration Tests)

Chạy toàn bộ bộ kiểm thử tự động của pipeline bằng `pytest`:

```powershell
python -m pytest scripts/academic_pipeline/tests -v
```

Kết quả: **6/6 tests passed (100%)**.
Bao gồm:
- Kiểm thử cấu hình cơ sở dữ liệu & phân tích chuỗi Spring Boot JDBC URL.
- Kiểm thử cơ chế lưu trữ nguyên tử và khôi phục checkpoint trạng thái watermark.
- Kiểm thử độ chính xác của các công thức tính toán chỉ số học thuật, tỷ lệ hoàn thành và phân loại học lực.
- Kiểm thử logic merge gia tăng (chèn mới, cập nhật bản ghi cũ, giữ nguyên bản ghi không đổi).
- Kiểm thử tích hợp trọn vẹn chu kỳ (Full Extraction -> Incremental Extraction -> Xử lý dữ liệu không đổi).
