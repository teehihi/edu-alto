"""
End-to-End Integration Tests for EduAlto Academic Data Pipeline.
Validates the full extraction cycle, incremental watermark extraction,
multi-format file exports, and state transitions.
"""

from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from scripts.academic_pipeline.config import DatabaseConfig, PipelineConfig
from scripts.academic_pipeline.db import DatabaseClient
from scripts.academic_pipeline.pipeline import AcademicPipeline


def seed_initial_test_data(engine: Engine):
    """Seed relational learning data into SQLite test database."""
    with engine.begin() as conn:
        # Users (Students & Instructors)
        conn.execute(text("""
            INSERT INTO users (id, full_name, email, status, created_at, updated_at) VALUES
            ('u-inst', 'Tran Van Thay', 'thay@edualto.vn', 'ACTIVE', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
            ('u-std1', 'Nguyen Van Hoc', 'hoc@edualto.vn', 'ACTIVE', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z'),
            ('u-std2', 'Le Thi Sinh', 'sinh@edualto.vn', 'ACTIVE', '2026-10-02T00:00:00Z', '2026-10-02T00:00:00Z');
        """))

        # Course
        conn.execute(text("""
            INSERT INTO courses (id, instructor_id, title, slug, level, status, created_at, updated_at) VALUES
            ('c-101', 'u-inst', 'Kien truc Phan mem Web', 'kien-truc-phan-mem', 'INTERMEDIATE', 'PUBLISHED', '2026-09-10T00:00:00Z', '2026-09-10T00:00:00Z');
        """))

        # Section
        conn.execute(text("""
            INSERT INTO sections (id, course_id, title, position, created_at, updated_at) VALUES
            ('sec-1', 'c-101', 'Chuong 1: Monolith vs Microservices', 1, '2026-09-11T00:00:00Z', '2026-09-11T00:00:00Z');
        """))

        # Lessons (3 lessons)
        conn.execute(text("""
            INSERT INTO lessons (id, section_id, title, lesson_type, position, duration_seconds, status, created_at, updated_at) VALUES
            ('les-1', 'sec-1', 'Tong quan Modular Monolith', 'VIDEO', 1, 600, 'PUBLISHED', '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z'),
            ('les-2', 'sec-1', 'Thiet ke Domain Model', 'VIDEO', 2, 900, 'PUBLISHED', '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z'),
            ('les-3', 'sec-1', 'Thuc hanh Spring Boot', 'VIDEO', 3, 1200, 'PUBLISHED', '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z');
        """))

        # Quizzes
        conn.execute(text("""
            INSERT INTO quizzes (id, lesson_id, passing_score, created_at) VALUES
            ('qz-1', 'les-2', 75.0, '2026-09-15T00:00:00Z');
        """))

        # Assignments
        conn.execute(text("""
            INSERT INTO assignments (id, course_id, title, max_score, status, due_at, created_at, updated_at) VALUES
            ('asn-1', 'c-101', 'Bai tap thiet ke Modular Monolith', 100.0, 'PUBLISHED', '2026-10-25T00:00:00Z', '2026-09-15T00:00:00Z', '2026-09-15T00:00:00Z');
        """))

        # Enrollments for Student 1 and Student 2
        conn.execute(text("""
            INSERT INTO enrollments (id, student_id, course_id, status, enrolled_at, created_at, updated_at) VALUES
            ('en-1', 'u-std1', 'c-101', 'ACTIVE', '2026-10-05T08:00:00Z', '2026-10-05T08:00:00Z', '2026-10-05T08:00:00Z'),
            ('en-2', 'u-std2', 'c-101', 'ACTIVE', '2026-10-06T09:00:00Z', '2026-10-06T09:00:00Z', '2026-10-06T09:00:00Z');
        """))

        # Progress for Student 1: completed 2 lessons
        conn.execute(text("""
            INSERT INTO learning_progress (id, enrollment_id, course_id, section_id, lesson_id, completed_at, created_at, updated_at) VALUES
            ('lp-1', 'en-1', 'c-101', 'sec-1', 'les-1', '2026-10-07T10:00:00Z', '2026-10-07T10:00:00Z', '2026-10-07T10:00:00Z'),
            ('lp-2', 'en-1', 'c-101', 'sec-1', 'les-2', '2026-10-08T11:00:00Z', '2026-10-08T11:00:00Z', '2026-10-08T11:00:00Z');
        """))

        # Quiz attempt for Student 1
        conn.execute(text("""
            INSERT INTO quiz_attempts (id, quiz_id, student_id, score, correct_answers, total_questions, passed, submitted_at) VALUES
            ('qa-1', 'qz-1', 'u-std1', 85.0, 4, 5, 1, '2026-10-08T11:30:00Z');
        """))

        # Assignment submission for Student 1
        conn.execute(text("""
            INSERT INTO assignment_submissions (id, assignment_id, student_id, submitted_at, score, created_at, updated_at) VALUES
            ('asub-1', 'asn-1', 'u-std1', '2026-10-20T14:00:00Z', 90.0, '2026-10-20T14:00:00Z', '2026-10-20T14:00:00Z');
        """))


def test_full_and_incremental_pipeline_e2e(sqlite_engine: Engine, temp_dir: Path):
    """Full lifecycle test: Full Run -> Incremental Modification -> Incremental Run -> Idempotent Run."""
    seed_initial_test_data(sqlite_engine)

    db_client = DatabaseClient(DatabaseConfig(database="test"), engine=sqlite_engine)
    config = PipelineConfig(
        output_dir=temp_dir,
        state_file=temp_dir / ".pipeline_state.json",
        enable_db_metrics_table=True,
    )
    pipeline = AcademicPipeline(config=config, db_client=db_client)

    # 1. RUN FULL EXTRACTION
    res_full = pipeline.run(mode="full")
    assert res_full["status"] == "SUCCESS"
    assert res_full["mode"] == "FULL"
    assert res_full["pairs_count"] == 2  # 2 students enrolled in c-101

    # Check exported artifacts
    csv_file = temp_dir / "student_course_academic_summary.csv"
    json_file = temp_dir / "student_course_academic_summary.json"
    parquet_file = temp_dir / "student_course_academic_summary.parquet"
    state_file = temp_dir / ".pipeline_state.json"

    assert csv_file.exists()
    assert json_file.exists()
    assert parquet_file.exists()
    assert state_file.exists()

    df_full = pd.read_csv(csv_file)
    assert len(df_full) == 2

    std1_row = df_full[df_full["student_id"] == "u-std1"].iloc[0]
    assert std1_row["completed_lessons_count"] == 2
    assert std1_row["total_lessons"] == 3
    assert std1_row["lesson_completion_rate_pct"] == 66.67
    assert std1_row["quizzes_attempted_count"] == 1
    assert std1_row["avg_quiz_score"] == 85.0
    assert std1_row["assignments_submitted_count"] == 1
    assert std1_row["avg_assignment_score_pct"] == 90.0

    std2_row = df_full[df_full["student_id"] == "u-std2"].iloc[0]
    assert std2_row["completed_lessons_count"] == 0
    assert std2_row["quizzes_attempted_count"] == 0

    first_watermark = res_full["watermark"]
    assert first_watermark is not None

    # 2. RUN INCREMENTAL WHEN NOTHING CHANGED
    res_inc_empty = pipeline.run(mode="incremental")
    assert res_inc_empty["mode"] == "INCREMENTAL"
    assert res_inc_empty["status"] == "UP_TO_DATE"
    assert res_inc_empty["changed_pairs_count"] == 0

    # 3. ADD NEW ACTIVITY FOR STUDENT 1 (completes 3rd lesson -> 100%)
    future_time = "2026-12-01T15:00:00Z"
    with sqlite_engine.begin() as conn:
        conn.execute(text(f"""
            INSERT INTO learning_progress (id, enrollment_id, course_id, section_id, lesson_id, completed_at, created_at, updated_at) VALUES
            ('lp-3', 'en-1', 'c-101', 'sec-1', 'les-3', '{future_time}', '{future_time}', '{future_time}');
        """))
        # Issue certificate
        conn.execute(text(f"""
            INSERT INTO certificates (id, student_id, course_id, certificate_number, issued_at, created_at) VALUES
            ('cert-1', 'u-std1', 'c-101', 'EA-CERT-2026-001', '{future_time}', '{future_time}');
        """))

    # 4. RUN INCREMENTAL EXTRACTION
    res_inc = pipeline.run(mode="incremental")
    assert res_inc["mode"] == "INCREMENTAL"
    assert res_inc["status"] == "SUCCESS"
    assert res_inc["changed_pairs_count"] == 1  # only (u-std1, c-101) changed

    # Verify updated CSV file
    df_updated = pd.read_csv(csv_file)
    assert len(df_updated) == 2  # still 2 rows, std1 updated and std2 preserved

    std1_new = df_updated[df_updated["student_id"] == "u-std1"].iloc[0]
    assert std1_new["completed_lessons_count"] == 3
    assert std1_new["lesson_completion_rate_pct"] == 100.0
    assert std1_new["is_course_completed"] == True
    assert std1_new["has_certificate"] == True
    assert std1_new["certificate_number"] == "EA-CERT-2026-001"
    assert std1_new["academic_status"] == "COMPLETED"

    # std2 must still be intact
    std2_new = df_updated[df_updated["student_id"] == "u-std2"].iloc[0]
    assert std2_new["completed_lessons_count"] == 0

    # Verify DB metrics table persistence includes last_activity_at
    with sqlite_engine.connect() as conn:
        row = conn.execute(text(
            "SELECT last_activity_at, is_inactive FROM academic_student_course_metrics WHERE student_id = 'u-std1' AND course_id = 'c-101'"
        )).fetchone()
        assert row is not None
        assert row[0] is not None
        assert "2026-12-01" in row[0]
