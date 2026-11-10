"""
EduAlto Learning Analytics - Raw Dataset Generator
Generates realistic raw learning activity data with intentional data quality issues:
- Duplicates (exact rows and student-assessment duplicates)
- Missing values (NaN, nulls in scores, time spent, study frequency)
- Anomalies and outliers (negative scores, score > max_score, unrealistic time spent)
- Mixed score scales (Quiz: 100, Assignment: 10, Midterm: 50, Final: 100)
"""

import os
import random
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

def generate_raw_edualto_dataset(output_path: str = "data/raw_learning_dataset.csv", n_records: int = 1000, seed: int = 42) -> pd.DataFrame:
    random.seed(seed)
    np.random.seed(seed)
    
    courses = [
        {"id": "C101", "title": "Lập trình Python cơ bản cho người mới bắt đầu", "total_lessons": 30},
        {"id": "C102", "title": "Lập trình Web Fullstack với Next.js & Spring Boot", "total_lessons": 45},
        {"id": "C103", "title": "Thiết kế UI/UX Chuyên nghiệp từ Figma đến Sản phẩm", "total_lessons": 28},
        {"id": "C104", "title": "Cơ sở dữ liệu PostgreSQL & Tối ưu hóa hiệu năng", "total_lessons": 36},
        {"id": "C105", "title": "Trí tuệ nhân tạo và Ứng dụng trong Giáo dục", "total_lessons": 40},
    ]
    
    assessment_configs = [
        {"type": "QUIZ", "max_score": 100.0, "typical_time": (10, 45)},
        {"type": "ASSIGNMENT", "max_score": 10.0, "typical_time": (60, 240)},
        {"type": "MIDTERM_EXAM", "max_score": 50.0, "typical_time": (45, 90)},
        {"type": "FINAL_PROJECT", "max_score": 100.0, "typical_time": (180, 600)},
    ]
    
    first_names = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ"]
    middle_names = ["Văn", "Thị", "Minh", "Nhật", "Công", "Đức", "Gia", "Thanh", "Quốc", "Hồng"]
    last_names = ["Hậu", "Thiên", "Anh", "Dũng", "Bảo", "Huy", "Thảo", "Tuấn", "Linh", "Nam", "Trang", "Khoa"]
    
    student_pool = []
    for i in range(1, 201):
        f = random.choice(first_names)
        m = random.choice(middle_names)
        l = random.choice(last_names)
        student_pool.append({
            "student_id": f"STD_{i:04d}",
            "student_name": f"{f} {m} {l}",
            "email": f"student_{i:04d}@edualto.edu.vn"
        })
        
    records = []
    start_date = datetime(2026, 9, 1)
    
    for i in range(n_records):
        student = random.choice(student_pool)
        course = random.choice(courses)
        assessment = random.choice(assessment_configs)
        
        max_score = assessment["max_score"]
        # Normal distribution of true abilities (mean ~ 75% of max_score)
        ability_ratio = np.clip(np.random.normal(0.75, 0.15), 0.2, 1.0)
        raw_score = round(ability_ratio * max_score, 1)
        
        typical_time = assessment["typical_time"]
        time_spent = random.randint(typical_time[0], typical_time[1])
        
        completed_lessons = random.randint(1, course["total_lessons"])
        study_freq = random.randint(1, 7)
        submission_days = random.randint(0, 60)
        submitted_at = start_date + timedelta(days=submission_days, minutes=random.randint(0, 1440))
        
        record = {
            "record_id": f"REC_{i+1:05d}",
            "student_id": student["student_id"],
            "student_name": student["student_name"],
            "student_email": student["email"],
            "course_id": course["id"],
            "course_title": course["title"],
            "assessment_id": f"ASM_{course['id']}_{assessment['type'][:3]}",
            "assessment_type": assessment["type"],
            "raw_score": raw_score,
            "max_score": max_score,
            "time_spent_minutes": time_spent,
            "completed_lessons_count": completed_lessons,
            "total_lessons_count": course["total_lessons"],
            "study_frequency_per_week": study_freq,
            "submitted_at": submitted_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        records.append(record)
        
    df = pd.DataFrame(records)
    
    # -------------------------------------------------------------
    # Inject deliberate dirty data issues to simulate real-world data
    # -------------------------------------------------------------
    
    # 1. Missing values
    missing_indices_student = np.random.choice(df.index, size=15, replace=False)
    df.loc[missing_indices_student, "student_id"] = np.nan
    
    missing_indices_score = np.random.choice(df.index, size=45, replace=False)
    df.loc[missing_indices_score, "raw_score"] = np.nan
    
    missing_indices_time = np.random.choice(df.index, size=35, replace=False)
    df.loc[missing_indices_time, "time_spent_minutes"] = np.nan
    
    missing_indices_freq = np.random.choice(df.index, size=30, replace=False)
    df.loc[missing_indices_freq, "study_frequency_per_week"] = np.nan
    
    missing_indices_lessons = np.random.choice(df.index, size=25, replace=False)
    df.loc[missing_indices_lessons, "completed_lessons_count"] = np.nan
    
    # 2. Anomalies & Outliers
    # Score > max_score (e.g. 135 on 100 scale, 15 on 10 scale)
    outlier_score_high = np.random.choice(df.index, size=15, replace=False)
    for idx in outlier_score_high:
        max_s = df.loc[idx, "max_score"]
        df.loc[idx, "raw_score"] = max_s * random.uniform(1.2, 1.8)
        
    # Negative scores
    outlier_score_neg = np.random.choice(df.index, size=10, replace=False)
    for idx in outlier_score_neg:
        df.loc[idx, "raw_score"] = -random.randint(5, 20)
        
    # Negative time spent
    outlier_time_neg = np.random.choice(df.index, size=10, replace=False)
    for idx in outlier_time_neg:
        df.loc[idx, "time_spent_minutes"] = -random.randint(10, 60)
        
    # Unrealistically huge time spent (e.g. 15,000 minutes)
    outlier_time_huge = np.random.choice(df.index, size=8, replace=False)
    for idx in outlier_time_huge:
        df.loc[idx, "time_spent_minutes"] = random.randint(8000, 25000)
        
    # Completed lessons > total lessons
    outlier_lessons = np.random.choice(df.index, size=10, replace=False)
    for idx in outlier_lessons:
        df.loc[idx, "completed_lessons_count"] = df.loc[idx, "total_lessons_count"] + random.randint(15, 50)
        
    # 3. Duplicate rows (Exact duplicate rows)
    dup_rows = df.sample(n=35, random_state=42)
    df = pd.concat([df, dup_rows], ignore_index=True)
    
    # 4. Duplicate submissions (Same student, course and assessment with different record_id)
    dup_sub = df.sample(n=25, random_state=123).copy()
    dup_sub["record_id"] = [f"REC_DUP_{k:04d}" for k in range(len(dup_sub))]
    dup_sub["submitted_at"] = (pd.to_datetime(dup_sub["submitted_at"]) + timedelta(days=2)).dt.strftime("%Y-%m-%d %H:%M:%S")
    # Slightly altered score to simulate re-attempt
    dup_sub["raw_score"] = np.clip(dup_sub["raw_score"] + 5, 0, 100)
    df = pd.concat([df, dup_sub], ignore_index=True)
    
    # Shuffle dataframe
    df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"Generated raw dataset with {len(df)} records at: {output_path}")
    return df

if __name__ == "__main__":
    generate_raw_edualto_dataset()
