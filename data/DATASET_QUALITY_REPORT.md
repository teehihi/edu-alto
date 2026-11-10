# BÁO CÁO CHẤT LƯỢNG VÀ XÁC THỰC DỮ LIỆU DATASET EDUALTO
**Mã nhiệm vụ:** EDU-100 (Epic: EDU-101)  
**Thời điểm thực thi:** 2026-11-10 23:35:29  
**Trạng thái kiểm tra:** **100% ĐẠT CHUẨN (VERIFIED & CLEANED)**  

---

## 1. TỔNG QUAN BIẾN ĐỘNG DỮ LIỆU (EXECUTIVE SUMMARY)

| Chỉ số | Trước khi làm sạch (Raw) | Sau khi làm sạch (Cleaned) | Chênh lệch / Tác động |
| :--- | :---: | :---: | :--- |
| **Tổng số bản ghi** | **1060** dòng | **870** dòng | Đã thanh lọc 190 dòng không hợp lệ |
| **Bản ghi trùng lặp hoàn toàn** | 37 | 0 | Đã xóa 100% dòng trùng lặp |
| **Lần nộp trùng ngữ nghĩa** | 138 | 0 | Giữ lần nộp có điểm cao nhất |
| **Khuyết thiếu mã học viên** | 15 | 0 | Đã loại bỏ do không thể gán định danh |
| **Missing values ở các cột số** | 113 | 0 | Đã điền (Imputation) theo trung vị nhóm |
| **Giá trị bất thường / Ngoại lai** | 52 | 0 | Đã chuẩn hóa & đưa về biên logic |

---

## 2. CHI TIẾT CÁC BƯỚC XỬ LÝ (CLEANING AUDIT LOG)

### 2.1. Xử lý dữ liệu trùng lặp (Duplicate Detection)
- **Xóa trùng lặp tuyệt đối:** Loại bỏ `37` bản ghi phát sinh do lỗi gửi đúp request từ trình duyệt.
- **Xử lý trùng lặp nộp bài (Semantic duplicates):** Phát hiện `138` lượt nộp lại bài của cùng một học viên cho cùng một bài kiểm tra. Áp dụng chính sách **Best Score Policy** (giữ lại kết quả thi cao nhất của học viên).

### 2.2. Xử lý giá trị khuyết thiếu (Missing Values Imputation)
- **Loại bỏ không định danh:** `15` dòng khuyết thiếu `student_id` đã bị loại bỏ vì không đáp ứng tính toàn vẹn định danh học thuật.
- **Điền khuyết thiếu điểm số (`raw_score`):** Điền `35` bản ghi bằng giá trị trung vị (*Median*) theo từng loại bài kiểm tra trong khóa học.
- **Điền khuyết thiếu thời gian (`time_spent_minutes`):** Điền `31` bản ghi bằng trung vị thời lượng của loại bài đánh giá tương ứng.
- **Điền khuyết thiếu tần suất học (`study_frequency_per_week`):** Điền `22` bản ghi bằng trung vị toàn hệ thống.
- **Điền khuyết thiếu tiến độ (`completed_lessons_count`):** Điền `25` bản ghi theo tiến độ trung vị của khóa học.

### 2.3. Xử lý dữ liệu bất thường và ngoại lai (Anomalies & Outliers)
- **Điểm số âm:** Đã phát hiện và đưa `7` điểm âm về mốc hợp lệ `0.0`.
- **Điểm vượt khung tối đa:** Đã chặn trần (Capped) `22` trường hợp điểm số > max_score về bằng đúng điểm tối đa của bài thi.
- **Thời lượng học không hợp lệ (<= 0 phút):** Đã sửa `8` trường hợp về thời gian trung vị chuẩn.
- **Thời lượng học bất thường cực lớn:** Đã phát hiện `8` trường hợp học viên treo máy làm thời gian kéo dài đột biến; áp dụng ngưỡng trần thống kê **IQR Upper Bound** = `720.0 phút` (tối đa 12 tiếng).
- **Tiến độ vượt tổng bài:** Đã hiệu chỉnh `7` trường hợp số bài hoàn thành vượt quá số bài thực tế của khóa.

---

## 3. THỐNG KÊ CHUẨN HÓA THANG ĐIỂM (SCORE NORMALIZATION)

Tất cả các hình thức đánh giá (Quiz thang 100, Assignment thang 10, Midterm thang 50, Final Project thang 100) đã được quy đổi đồng nhất về **Thang điểm 10 học thuật Việt Nam** và **Thang điểm chuẩn hóa [0.0, 1.0]**.

### 3.1. Thống kê phân phối điểm số (Thang 10):
- **Điểm trung bình (Mean):** `7.6 / 10.0`
- **Điểm trung vị (Median):** `7.67 / 10.0`
- **Độ lệch chuẩn (Std Dev):** `1.56`
- **Điểm thấp nhất (Min):** `0.0 / 10.0`
- **Điểm cao nhất (Max):** `10.0 / 10.0`
- **Phân vị 25% (Q1):** `6.66 / 10.0`
- **Phân vị 75% (Q3):** `8.58 / 10.0`
- **Tỷ lệ đạt (Pass Rate >= 5.0):** **`96.7%`**

### 3.2. Phân loại học lực học viên:
| Xếp loại học lực | Thang điểm chuẩn | Số lượng học viên | Tỷ lệ (%) |
| :--- | :---: | :---: | :---: |
| **Xuất sắc** | >= 9.0 | 166 | 19.1% |
| **Giỏi** | 8.0 - 8.9 | 182 | 20.9% |
| **Khá** | 6.5 - 7.9 | 340 | 39.1% |
| **Trung bình** | 5.0 - 6.4 | 153 | 17.6% |
| **Yếu** | < 5.0 | 29 | 3.3% |

---

## 4. BẢNG KIỂM TRA TÍNH TOÀN VẸN (DATA INTEGRITY CHECKS)

| Tiêu chuẩn kiểm tra | Quy tắc xác thực | Kết quả kiểm tra | Đánh giá |
| :--- | :--- | :---: | :---: |
| **Độ đầy đủ (Completeness)** | Không còn giá trị Null ở các cột bắt buộc | `0 nulls` | **PASSED** |
| **Tính hợp lệ biên điểm (Validity)** | 0.0 <= score_scale_10 <= 10.0 | 100% trong khoảng [0, 10] | **PASSED** |
| **Tính đơn nhất (Uniqueness)** | Không còn bản ghi trùng lặp khóa học thuật | `0 duplicates` | **PASSED** |
| **Tính nhất quán tiến độ (Consistency)** | completed_lessons <= total_lessons | 100% hợp lệ | **PASSED** |
| **Sẵn sàng huấn luyện AI (AI Readiness)** | Tồn tại cột score_normalized_0_1 trong [0, 1] | 100% hợp lệ | **PASSED** |

---
*Báo cáo được khởi tạo tự động bởi EduAlto Data Quality Pipeline (Ticket EDU-100).*
