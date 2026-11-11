"""
Unit tests for EduAlto Data Cleaning and Validation Pipeline (EDU-100)
"""

import os
import sys
import tempfile
import pytest
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from clean_and_validate_dataset import EduAltoDataCleaner

@pytest.fixture
def sample_dirty_df():
    data = [
        # Normal row 1 (Quiz out of 100)
        {"record_id": "R01", "student_id": "S1", "student_name": "Nguyen Van A", "student_email": "a@edualto.edu.vn",
         "course_id": "C101", "course_title": "Python", "assessment_id": "ASM01", "assessment_type": "QUIZ",
         "raw_score": 85.0, "max_score": 100.0, "time_spent_minutes": 25, "completed_lessons_count": 10,
         "total_lessons_count": 30, "study_frequency_per_week": 4, "submitted_at": "2026-09-01 10:00:00"},
         
        # Exact duplicate of R01 (different record_id)
        {"record_id": "R01_DUP", "student_id": "S1", "student_name": "Nguyen Van A", "student_email": "a@edualto.edu.vn",
         "course_id": "C101", "course_title": "Python", "assessment_id": "ASM01", "assessment_type": "QUIZ",
         "raw_score": 85.0, "max_score": 100.0, "time_spent_minutes": 25, "completed_lessons_count": 10,
         "total_lessons_count": 30, "study_frequency_per_week": 4, "submitted_at": "2026-09-01 10:00:00"},
         
        # Semantic duplicate of S1, ASM01 with lower score
        {"record_id": "R01_RETRY", "student_id": "S1", "student_name": "Nguyen Van A", "student_email": "a@edualto.edu.vn",
         "course_id": "C101", "course_title": "Python", "assessment_id": "ASM01", "assessment_type": "QUIZ",
         "raw_score": 60.0, "max_score": 100.0, "time_spent_minutes": 20, "completed_lessons_count": 10,
         "total_lessons_count": 30, "study_frequency_per_week": 4, "submitted_at": "2026-09-02 10:00:00"},

        # Missing student_id (unidentifiable -> should be dropped)
        {"record_id": "R02", "student_id": None, "student_name": "Unknown", "student_email": "u@edualto.edu.vn",
         "course_id": "C101", "course_title": "Python", "assessment_id": "ASM01", "assessment_type": "QUIZ",
         "raw_score": 70.0, "max_score": 100.0, "time_spent_minutes": 30, "completed_lessons_count": 5,
         "total_lessons_count": 30, "study_frequency_per_week": 2, "submitted_at": "2026-09-01 11:00:00"},

        # Missing score and time (should be imputed)
        {"record_id": "R03", "student_id": "S2", "student_name": "Tran Thi B", "student_email": "b@edualto.edu.vn",
         "course_id": "C101", "course_title": "Python", "assessment_id": "ASM02", "assessment_type": "ASSIGNMENT",
         "raw_score": None, "max_score": 10.0, "time_spent_minutes": None, "completed_lessons_count": None,
         "total_lessons_count": 30, "study_frequency_per_week": None, "submitted_at": "2026-09-03 14:00:00"},

        # Anomalies: negative score, score > max_score, negative time, lessons > total
        {"record_id": "R04", "student_id": "S3", "student_name": "Le Van C", "student_email": "c@edualto.edu.vn",
         "course_id": "C102", "course_title": "Fullstack", "assessment_id": "ASM03", "assessment_type": "QUIZ",
         "raw_score": -15.0, "max_score": 100.0, "time_spent_minutes": -40, "completed_lessons_count": 50,
         "total_lessons_count": 45, "study_frequency_per_week": 3, "submitted_at": "2026-09-04 09:00:00"},

        {"record_id": "R05", "student_id": "S4", "student_name": "Pham Van D", "student_email": "d@edualto.edu.vn",
         "course_id": "C102", "course_title": "Fullstack", "assessment_id": "ASM04", "assessment_type": "ASSIGNMENT",
         "raw_score": 14.5, "max_score": 10.0, "time_spent_minutes": 25000, "completed_lessons_count": 20,
         "total_lessons_count": 45, "study_frequency_per_week": 5, "submitted_at": "2026-09-05 16:00:00"}
    ]
    return pd.DataFrame(data)

def test_remove_duplicates(sample_dirty_df):
    cleaner = EduAltoDataCleaner()
    df = cleaner.remove_duplicates(sample_dirty_df, strategy="best_score")
    
    # R01_DUP should be removed
    assert cleaner.audit_log["exact_duplicates_removed"] == 1
    # R01_RETRY (lower score 60 vs 85) should be removed under best_score strategy
    assert cleaner.audit_log["semantic_duplicates_removed"] == 1
    
    # S1 should only appear once
    s1_rows = df[df["student_id"] == "S1"]
    assert len(s1_rows) == 1
    assert s1_rows.iloc[0]["raw_score"] == 85.0


def test_remove_duplicates_best_score_prefers_valid_over_outlier_and_normalizes_scale():
    cleaner = EduAltoDataCleaner()
    df = pd.DataFrame([
        {
            "record_id": "R_OUTLIER",
            "student_id": "S1",
            "course_id": "C1",
            "assessment_id": "A1",
            "raw_score": 170.0,
            "max_score": 100.0,
            "submitted_at": "2026-09-01 09:00:00",
        },
        {
            "record_id": "R_VALID",
            "student_id": "S1",
            "course_id": "C1",
            "assessment_id": "A1",
            "raw_score": 95.0,
            "max_score": 100.0,
            "submitted_at": "2026-09-02 09:00:00",
        },
        {
            "record_id": "R_SCALE_100",
            "student_id": "S2",
            "course_id": "C1",
            "assessment_id": "A2",
            "raw_score": 60.0,
            "max_score": 100.0,
            "submitted_at": "2026-09-01 10:00:00",
        },
        {
            "record_id": "R_SCALE_10",
            "student_id": "S2",
            "course_id": "C1",
            "assessment_id": "A2",
            "raw_score": 9.0,
            "max_score": 10.0,
            "submitted_at": "2026-09-02 10:00:00",
        },
    ])

    deduped = cleaner.remove_duplicates(df, strategy="best_score")
    assert len(deduped) == 2
    s1_pick = deduped[deduped["student_id"] == "S1"].iloc[0]
    s2_pick = deduped[deduped["student_id"] == "S2"].iloc[0]
    assert s1_pick["record_id"] == "R_VALID"
    assert s1_pick["raw_score"] == 95.0
    assert s2_pick["record_id"] == "R_SCALE_10"
    assert s2_pick["raw_score"] == 9.0

def test_handle_missing_values(sample_dirty_df):
    cleaner = EduAltoDataCleaner()
    df = cleaner.handle_missing_values(sample_dirty_df)
    
    # Missing student_id row R02 should be dropped
    assert cleaner.audit_log["missing_identities_dropped"] == 1
    assert "R02" not in df["record_id"].values
    
    # Missing columns in R03 should be imputed without NaNs
    assert df["raw_score"].isnull().sum() == 0
    assert df["time_spent_minutes"].isnull().sum() == 0
    assert df["study_frequency_per_week"].isnull().sum() == 0
    assert df["completed_lessons_count"].isnull().sum() == 0

def test_detect_and_handle_anomalies(sample_dirty_df):
    cleaner = EduAltoDataCleaner()
    # First handle missing so calculations work cleanly
    df = cleaner.handle_missing_values(sample_dirty_df)
    df = cleaner.detect_and_handle_anomalies(df)
    
    # Negative score should be fixed to 0
    assert (df["raw_score"] < 0).sum() == 0
    assert df.loc[df["record_id"] == "R04", "raw_score"].iloc[0] == 0.0
    
    # Score > max_score should be capped at max_score (10.0 for R05)
    assert (df["raw_score"] > df["max_score"]).sum() == 0
    assert df.loc[df["record_id"] == "R05", "raw_score"].iloc[0] == 10.0
    
    # Non-positive time should be corrected to > 0
    assert (df["time_spent_minutes"] <= 0).sum() == 0
    
    # Extreme time should be capped <= 720.0
    assert df.loc[df["record_id"] == "R05", "time_spent_minutes"].iloc[0] <= 720.0
    
    # Completed lessons count should be <= total_lessons_count
    assert (df["completed_lessons_count"] > df["total_lessons_count"]).sum() == 0
    assert df.loc[df["record_id"] == "R04", "completed_lessons_count"].iloc[0] == 45

def test_normalize_scores(sample_dirty_df):
    cleaner = EduAltoDataCleaner()
    df = cleaner.handle_missing_values(sample_dirty_df)
    df = cleaner.detect_and_handle_anomalies(df)
    df = cleaner.normalize_scores(df)
    
    # All normalized scores must be within valid boundaries
    assert df["score_scale_10"].min() >= 0.0
    assert df["score_scale_10"].max() <= 10.0
    
    assert df["score_scale_100"].min() >= 0.0
    assert df["score_scale_100"].max() <= 100.0
    
    assert df["score_normalized_0_1"].min() >= 0.0
    assert df["score_normalized_0_1"].max() <= 1.0
    
    # Academic rank must be assigned
    valid_ranks = {"Xuất sắc", "Giỏi", "Khá", "Trung bình", "Yếu"}
    assert set(df["academic_rank"].unique()).issubset(valid_ranks)

def test_full_pipeline_end_to_end():
    with tempfile.TemporaryDirectory() as tmp_dir:
        raw_csv = os.path.join(tmp_dir, "raw.csv")
        clean_csv = os.path.join(tmp_dir, "clean.csv")
        report_md = os.path.join(tmp_dir, "report.md")
        
        # Write small sample
        df = pd.DataFrame([
            {"record_id": "1", "student_id": "S1", "course_id": "C1", "assessment_id": "A1",
             "assessment_type": "QUIZ", "raw_score": 90.0, "max_score": 100.0, "time_spent_minutes": 20,
             "completed_lessons_count": 10, "total_lessons_count": 20, "study_frequency_per_week": 3,
             "submitted_at": "2026-09-01 12:00:00"}
        ])
        df.to_csv(raw_csv, index=False, encoding="utf-8-sig")
        
        cleaner = EduAltoDataCleaner(raw_path=raw_csv, output_path=clean_csv, report_path=report_md)
        cleaned_df, report_content = cleaner.run_pipeline()
        
        assert os.path.exists(clean_csv)
        assert os.path.exists(report_md)
        assert len(cleaned_df) == 1
        assert "BÁO CÁO CHẤT LƯỢNG VÀ XÁC THỰC DỮ LIỆU DATASET EDUALTO" in report_content
