"""
Unit tests for EduAlto Data Cleaning and Validation Pipeline (EDU-100)
"""

import os
import sys
import tempfile
from pathlib import Path
import pytest
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.dirname(__file__))

from clean_and_validate_dataset import EduAltoDataCleaner
from clean_and_validate_dataset import main as cleaner_cli_main
from scripts.academic_pipeline.config import DatabaseConfig, PipelineConfig
from scripts.academic_pipeline.db import DatabaseClient
from scripts.academic_pipeline.pipeline import AcademicPipeline

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


def _build_academic_sqlite_engine():
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE users (id TEXT PRIMARY KEY, full_name TEXT, email TEXT, status TEXT, created_at TEXT, updated_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE courses (id TEXT PRIMARY KEY, instructor_id TEXT, title TEXT, slug TEXT, level TEXT, status TEXT, created_at TEXT, updated_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE sections (id TEXT PRIMARY KEY, course_id TEXT, title TEXT, position INTEGER, created_at TEXT, updated_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE lessons (id TEXT PRIMARY KEY, section_id TEXT, title TEXT, lesson_type TEXT, position INTEGER, duration_seconds INTEGER, status TEXT, created_at TEXT, updated_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE enrollments (id TEXT PRIMARY KEY, student_id TEXT, course_id TEXT, status TEXT, enrolled_at TEXT, created_at TEXT, updated_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE learning_progress (id TEXT PRIMARY KEY, enrollment_id TEXT, course_id TEXT, section_id TEXT, lesson_id TEXT, completed_at TEXT, created_at TEXT, updated_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE quizzes (id TEXT PRIMARY KEY, lesson_id TEXT, passing_score REAL, created_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE quiz_attempts (id TEXT PRIMARY KEY, quiz_id TEXT, student_id TEXT, score REAL, correct_answers INTEGER, total_questions INTEGER, passed INTEGER, submitted_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE assignments (id TEXT PRIMARY KEY, course_id TEXT, title TEXT, max_score REAL, status TEXT, due_at TEXT, created_at TEXT, updated_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE assignment_submissions (id TEXT PRIMARY KEY, assignment_id TEXT, student_id TEXT, submitted_at TEXT, score REAL, created_at TEXT, updated_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE discussions (id TEXT PRIMARY KEY, course_id TEXT, lesson_id TEXT, author_id TEXT, title TEXT, body TEXT, video_timestamp_seconds INTEGER, created_at TEXT, updated_at TEXT, deleted_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE discussion_comments (id TEXT PRIMARY KEY, discussion_id TEXT, author_id TEXT, body TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE certificates (id TEXT PRIMARY KEY, student_id TEXT, course_id TEXT, certificate_number TEXT, issued_at TEXT, created_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE course_reviews (id TEXT PRIMARY KEY, student_id TEXT, course_id TEXT, rating INTEGER, status TEXT, created_at TEXT, updated_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE learning_notes (id TEXT PRIMARY KEY, user_id TEXT, lesson_id TEXT, title TEXT, content TEXT, created_at TEXT, updated_at TEXT);
        """))
        conn.execute(text("""
            CREATE TABLE learning_activities (id TEXT PRIMARY KEY, student_id TEXT, course_id TEXT, section_id TEXT, lesson_id TEXT, activity_type TEXT, source_id TEXT, occurred_at TEXT, metadata TEXT, created_at TEXT, updated_at TEXT);
        """))

        conn.execute(text("""
            INSERT INTO users VALUES
            ('u-inst', 'Instructor', 'inst@edualto.vn', 'ACTIVE', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
            ('u-s1', 'Nguyen Van A', 'a@edualto.vn', 'ACTIVE', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z'),
            ('u-s2', 'Tran Thi B', 'b@edualto.vn', 'ACTIVE', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z');
        """))
        conn.execute(text("""
            INSERT INTO courses VALUES
            ('c-1', 'u-inst', 'Machine Learning 101', 'ml-101', 'INTERMEDIATE', 'PUBLISHED', '2026-09-10T00:00:00Z', '2026-09-10T00:00:00Z');
        """))
        conn.execute(text("""
            INSERT INTO sections VALUES
            ('sec-1', 'c-1', 'Chuong 1', 1, '2026-09-10T00:00:00Z', '2026-09-10T00:00:00Z');
        """))
        conn.execute(text("""
            INSERT INTO lessons VALUES
            ('les-1', 'sec-1', 'Video Intro', 'VIDEO', 1, 600, 'PUBLISHED', '2026-09-10T00:00:00Z', '2026-09-10T00:00:00Z'),
            ('les-2', 'sec-1', 'Reading Doc', 'TEXT', 2, 300, 'PUBLISHED', '2026-09-10T00:00:00Z', '2026-09-10T00:00:00Z');
        """))
        conn.execute(text("""
            INSERT INTO enrollments VALUES
            ('en-1', 'u-s1', 'c-1', 'ACTIVE', '2026-10-05T08:00:00Z', '2026-10-05T08:00:00Z', '2026-10-05T08:00:00Z'),
            ('en-2', 'u-s2', 'c-1', 'ACTIVE', '2026-10-06T08:00:00Z', '2026-10-06T08:00:00Z', '2026-10-06T08:00:00Z');
        """))
        conn.execute(text("""
            INSERT INTO learning_progress VALUES
            ('lp-1', 'en-1', 'c-1', 'sec-1', 'les-1', '2026-10-07T09:00:00Z', '2026-10-07T09:00:00Z', '2026-10-07T09:00:00Z');
        """))
        conn.execute(text("""
            INSERT INTO quizzes VALUES
            ('qz-1', 'les-2', 70.0, '2026-09-15T00:00:00Z');
        """))
        # Two attempts for s1 on qz-1 -> cleaner should keep best score (90.0) in entities mode
        conn.execute(text("""
            INSERT INTO quiz_attempts VALUES
            ('qa-1', 'qz-1', 'u-s1', 60.0, 6, 10, 0, '2026-10-08T10:00:00Z'),
            ('qa-2', 'qz-1', 'u-s1', 90.0, 9, 10, 1, '2026-10-08T10:20:00Z');
        """))
        # Ungraded assignment submission for s1 -> cleaner should impute missing raw_score cleanly
        conn.execute(text("""
            INSERT INTO assignments VALUES
            ('asn-1', 'c-1', 'Final Assignment', 10.0, 'PUBLISHED', '2026-10-25T00:00:00Z', '2026-09-15T00:00:00Z', '2026-09-15T00:00:00Z');
        """))
        conn.execute(text("""
            INSERT INTO assignment_submissions VALUES
            ('asub-1', 'asn-1', 'u-s1', '2026-10-12T12:00:00Z', NULL, '2026-10-12T12:00:00Z', '2026-10-12T12:00:00Z');
        """))
        conn.execute(
            text("""
                INSERT INTO learning_activities
                (id, student_id, course_id, section_id, lesson_id, activity_type, source_id, occurred_at, metadata, created_at, updated_at)
                VALUES (:id, :sid, :cid, :sec, :les, :atype, :src, :occ, :meta, :occ, :occ)
            """),
            [
                {"id": "la-1", "sid": "u-s1", "cid": "c-1", "sec": "sec-1", "les": "les-1", "atype": "VIDEO_WATCHED", "src": None, "occ": "2026-10-07T08:50:00Z", "meta": '{"duration_seconds":360,"position_seconds":360}'},
                {"id": "la-2", "sid": "u-s1", "cid": "c-1", "sec": "sec-1", "les": "les-2", "atype": "LESSON_VIEWED", "src": None, "occ": "2026-10-08T09:50:00Z", "meta": '{"lesson_type":"TEXT"}'},
                {"id": "la-3", "sid": "u-s1", "cid": "c-1", "sec": "sec-1", "les": "les-2", "atype": "LESSON_VIEWED", "src": None, "occ": "2026-10-08T09:55:00Z", "meta": '{"lesson_type":"TEXT","reading_time_seconds":120}'},
                {"id": "la-4", "sid": "u-s1", "cid": "c-1", "sec": "sec-1", "les": "les-2", "atype": "QUIZ_SUBMITTED", "src": "qa-2", "occ": "2026-10-08T10:20:00Z", "meta": '{"score":90.0,"passed":true,"durationSeconds":300}'},
            ],
        )
    return engine


def test_edu99_summary_and_entities_connect_to_edu100_e2e():
    engine = _build_academic_sqlite_engine()
    try:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            exports_dir = tmp_path / "academic_exports"
            pipeline = AcademicPipeline(
                config=PipelineConfig(
                    output_dir=exports_dir,
                    state_file=exports_dir / ".pipeline_state.json",
                    enable_db_metrics_table=False,
                ),
                db_client=DatabaseClient(DatabaseConfig(database="test"), engine=engine),
            )
            res = pipeline.run(mode="full", export_entities=True)
            assert res["status"] == "SUCCESS"

            # 1. Test cleaning Parquet summary output from EDU-99 via auto-detection
            summary_clean_csv = tmp_path / "clean_summary.csv"
            summary_report_md = tmp_path / "summary_report.md"
            summary_cleaner = EduAltoDataCleaner(
                raw_path=str(exports_dir / "student_course_academic_summary.parquet"),
                output_path=str(summary_clean_csv),
                report_path=str(summary_report_md),
            )
            summary_cleaned, summary_report = summary_cleaner.run_pipeline()
            assert summary_cleaner.audit_log["source_mode"] == "academic-summary"
            assert len(summary_cleaned) == 2
            assert summary_cleaned["score_scale_10"].between(0.0, 10.0).all()
            assert summary_cleaned["score_normalized_0_1"].between(0.0, 1.0).all()
            s1_row = summary_cleaned[summary_cleaned["student_id"] == "u-s1"].iloc[0]
            assert s1_row["total_study_time_seconds"] == 780  # 360 + 120 + 300
            assert s1_row["time_spent_minutes"] == 13.0
            assert "learning_activities" in summary_report

            # 2. Test cleaning entities/ export from EDU-99 (dedups multiple quiz attempts + keeps telemetry) via CLI
            entities_clean_parquet = tmp_path / "clean_entities.parquet"
            entities_report_md = tmp_path / "entities_report.md"
            exit_code = cleaner_cli_main([
                "--input", str(exports_dir / "student_course_academic_summary.csv"),
                "--entities-dir", str(exports_dir / "entities"),
                "--output", str(entities_clean_parquet),
                "--report", str(entities_report_md),
                "--source", "academic-entities",
            ])
            assert exit_code == 0
            assert entities_clean_parquet.exists()
            entities_cleaned = pd.read_parquet(entities_clean_parquet)
            # 1 best quiz attempt for s1 (qa-2=90, qa-1=60 deduped) + 1 assignment for s1 + 1 overall row for s2 = 3 rows
            assert len(entities_cleaned) == 3
            s1_quiz = entities_cleaned[
                (entities_cleaned["student_id"] == "u-s1") & (entities_cleaned["assessment_type"] == "QUIZ")
            ].iloc[0]
            assert s1_quiz["raw_score"] == 90.0
            assert s1_quiz["time_spent_minutes"] == 5.0  # from qa-2 QUIZ_SUBMITTED durationSeconds=300
            assert s1_quiz["video_watch_seconds"] == 360
            assert s1_quiz["text_reading_seconds"] == 120
            report_text = entities_report_md.read_text(encoding="utf-8")
            assert "academic-entities" in report_text
    finally:
        engine.dispose()


def test_cleaner_handles_empty_and_all_nan_sparse_dataframe():
    cleaner = EduAltoDataCleaner()
    sparse_df = pd.DataFrame([
        {
            "record_id": "R1",
            "student_id": "S1",
            "course_id": "C1",
            "assessment_id": "A1",
            "assessment_type": "COURSE_OVERALL",
            "raw_score": np.nan,
            "max_score": 100.0,
            "time_spent_minutes": np.nan,
            "completed_lessons_count": np.nan,
            "total_lessons_count": 10,
            "study_frequency_per_week": np.nan,
            "submitted_at": "2026-10-01T10:00:00Z",
        }
    ])
    cleaned = cleaner.remove_duplicates(sparse_df)
    cleaned = cleaner.handle_missing_values(cleaned)
    cleaned = cleaner.detect_and_handle_anomalies(cleaned)
    cleaned = cleaner.normalize_scores(cleaned)

    assert cleaned["raw_score"].iloc[0] == 0.0
    assert cleaned["time_spent_minutes"].iloc[0] > 0.0
    assert cleaner.audit_log["score_statistics"]["std"] == 0.0

    empty_df = sparse_df.iloc[0:0].copy()
    cleaned_empty = cleaner.normalize_scores(cleaner.detect_and_handle_anomalies(cleaner.handle_missing_values(cleaner.remove_duplicates(empty_df))))
    assert len(cleaned_empty) == 0
