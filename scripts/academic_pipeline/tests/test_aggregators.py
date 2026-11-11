"""
Unit tests for the Academic Data Aggregator.
Tests metric calculations, composite score weighting, and incremental merging logic.
"""

from datetime import datetime, timezone
import pandas as pd
import pytest

from scripts.academic_pipeline.aggregators import AcademicAggregator


def test_aggregate_complete_student_telemetry():
    agg = AcademicAggregator(reference_time=datetime(2026, 11, 10, 12, 0, 0, tzinfo=timezone.utc))

    enrollments = pd.DataFrame([{
        "enrollment_id": "en-1",
        "student_id": "std-1",
        "student_name": "Nguyen Van A",
        "student_email": "a@edualto.vn",
        "course_id": "crs-1",
        "course_title": "Python Basics",
        "course_slug": "python-basics",
        "course_level": "BEGINNER",
        "enrollment_status": "ACTIVE",
        "enrolled_at": "2026-10-01T08:00:00Z",
    }])

    curriculum = pd.DataFrame([{
        "course_id": "crs-1",
        "total_lessons": 10,
        "total_duration_seconds": 6000,
        "total_quizzes": 2,
        "total_assignments": 1,
    }])

    # 10 out of 10 lessons completed
    progress = pd.DataFrame([
        {
            "student_id": "std-1",
            "course_id": "crs-1",
            "lesson_id": f"les-{i}",
            "completed_at": f"2026-10-{i+1:02d}T09:00:00Z",
            "duration_seconds": 600,
        }
        for i in range(10)
    ])

    quizzes = pd.DataFrame([
        {
            "attempt_id": "att-1",
            "student_id": "std-1",
            "course_id": "crs-1",
            "quiz_id": "q-1",
            "score": 90.0,
            "correct_answers": 9,
            "total_questions": 10,
            "passed": True,
            "submitted_at": "2026-10-05T10:00:00Z",
        },
        {
            "attempt_id": "att-2",
            "student_id": "std-1",
            "course_id": "crs-1",
            "quiz_id": "q-2",
            "score": 100.0,
            "correct_answers": 10,
            "total_questions": 10,
            "passed": True,
            "submitted_at": "2026-10-10T10:00:00Z",
        },
    ])

    assignments = pd.DataFrame([{
        "submission_id": "sub-1",
        "student_id": "std-1",
        "course_id": "crs-1",
        "assignment_id": "asn-1",
        "submitted_at": "2026-10-08T12:00:00Z",
        "score": 95.0,
        "max_score": 100.0,
        "due_at": "2026-10-10T00:00:00Z",
        "is_on_time": True,
    }])

    discussions = pd.DataFrame([{
        "discussion_id": "d-1",
        "student_id": "std-1",
        "course_id": "crs-1",
        "video_timestamp_seconds": 120,
        "created_at": "2026-10-02T14:00:00Z",
    }])

    comments = pd.DataFrame([{
        "comment_id": "c-1",
        "student_id": "std-1",
        "course_id": "crs-1",
        "created_at": "2026-10-03T15:00:00Z",
    }])

    certificates = pd.DataFrame([{
        "certificate_id": "cert-1",
        "student_id": "std-1",
        "course_id": "crs-1",
        "certificate_number": "EA-TEST-001",
        "issued_at": "2026-10-11T09:00:00Z",
    }])

    reviews = pd.DataFrame([{
        "review_id": "rev-1",
        "student_id": "std-1",
        "course_id": "crs-1",
        "rating": 5,
        "created_at": "2026-10-12T10:00:00Z",
    }])

    notes = pd.DataFrame([{
        "note_id": "n-1",
        "student_id": "std-1",
        "course_id": "crs-1",
        "created_at": "2026-10-04T11:00:00Z",
    }])

    result = agg.aggregate(
        enrollments_df=enrollments,
        curriculum_df=curriculum,
        progress_df=progress,
        quiz_df=quizzes,
        assignment_df=assignments,
        discussions_df=discussions,
        comments_df=comments,
        certificates_df=certificates,
        reviews_df=reviews,
        notes_df=notes,
    )

    assert len(result) == 1
    row = result.iloc[0]

    # Verification of key academic metrics
    assert row["student_id"] == "std-1"
    assert row["course_id"] == "crs-1"
    assert row["completed_lessons_count"] == 10
    assert row["total_lessons"] == 10
    assert row["lesson_completion_rate_pct"] == 100.0

    # Quizzes
    assert row["quizzes_attempted_count"] == 2
    assert row["quizzes_passed_count"] == 2
    assert row["avg_quiz_score"] == 95.0
    assert row["quiz_accuracy_pct"] == 95.0

    # Assignments
    assert row["assignments_submitted_count"] == 1
    assert row["avg_assignment_score_pct"] == 95.0
    assert row["submissions_on_time_count"] == 1

    # Interactions & Certificates
    assert row["discussions_count"] == 1
    assert row["video_timestamp_questions_count"] == 1
    assert row["discussion_comments_count"] == 1
    assert row["total_interactions_count"] == 2
    assert row["learning_notes_count"] == 1
    assert row["has_certificate"] == True
    assert row["certificate_number"] == "EA-TEST-001"
    assert row["has_reviewed_course"] == True
    assert row["review_rating"] == 5.0
    assert row["is_course_completed"] == True
    assert row["academic_status"] == "COMPLETED"
    assert row["academic_engagement_score"] >= 80.0


def test_merge_incremental():
    hist = pd.DataFrame([
        {"student_id": "s1", "course_id": "c1", "student_name": "User 1", "course_title": "C1", "completed_lessons_count": 2},
        {"student_id": "s2", "course_id": "c1", "student_name": "User 2", "course_title": "C1", "completed_lessons_count": 5},
    ])

    inc = pd.DataFrame([
        # Updated record for s1, c1
        {"student_id": "s1", "course_id": "c1", "student_name": "User 1", "course_title": "C1", "completed_lessons_count": 6},
        # Brand new record for s3, c1
        {"student_id": "s3", "course_id": "c1", "student_name": "User 3", "course_title": "C1", "completed_lessons_count": 1},
    ])

    merged = AcademicAggregator.merge_incremental(hist, inc)

    assert len(merged) == 3
    # s1 should have updated value 6
    s1_row = merged[(merged["student_id"] == "s1") & (merged["course_id"] == "c1")].iloc[0]
    assert s1_row["completed_lessons_count"] == 6

    # s2 should remain untouched with value 5
    s2_row = merged[(merged["student_id"] == "s2") & (merged["course_id"] == "c1")].iloc[0]
    assert s2_row["completed_lessons_count"] == 5

    # s3 should be appended with value 1
    s3_row = merged[(merged["student_id"] == "s3") & (merged["course_id"] == "c1")].iloc[0]
    assert s3_row["completed_lessons_count"] == 1


def test_aggregate_learning_activities_telemetry():
    agg = AcademicAggregator(reference_time=datetime(2026, 11, 10, 12, 0, 0, tzinfo=timezone.utc))

    enrollments = pd.DataFrame([{
        "enrollment_id": "en-1",
        "student_id": "std-1",
        "student_name": "Nguyen Van B",
        "student_email": "b@edualto.vn",
        "course_id": "crs-1",
        "course_title": "AI Foundations",
        "course_slug": "ai-foundations",
        "course_level": "BEGINNER",
        "enrollment_status": "ACTIVE",
        "enrolled_at": "2026-10-01T08:00:00Z",
    }])
    curriculum = pd.DataFrame([{
        "course_id": "crs-1",
        "total_lessons": 5,
        "total_duration_seconds": 3000,
        "total_quizzes": 1,
        "total_assignments": 0,
    }])

    empty_df = pd.DataFrame()
    activities = pd.DataFrame([
        {
            "activity_id": "a1",
            "student_id": "std-1",
            "course_id": "crs-1",
            "activity_type": "LESSON_VIEWED",
            "occurred_at": "2026-10-02T09:00:00Z",
            "metadata": '{"lesson_type": "VIDEO"}',
        },
        {
            "activity_id": "a2",
            "student_id": "std-1",
            "course_id": "crs-1",
            "activity_type": "VIDEO_WATCHED",
            "occurred_at": "2026-10-02T09:10:00Z",
            "metadata": '{"duration_seconds": 240, "position_seconds": 240}',
        },
        {
            "activity_id": "a3",
            "student_id": "std-1",
            "course_id": "crs-1",
            "activity_type": "LESSON_VIEWED",
            "occurred_at": "2026-10-03T10:00:00Z",
            "metadata": '{"lesson_type": "TEXT"}',
        },
        {
            # Active reading flush emits LESSON_VIEWED with reading_time_seconds; should add study time without inflating views
            "activity_id": "a4",
            "student_id": "std-1",
            "course_id": "crs-1",
            "activity_type": "LESSON_VIEWED",
            "occurred_at": "2026-10-03T10:05:00Z",
            "metadata": '{"lesson_type": "TEXT", "reading_time_seconds": 95}',
        },
        {
            "activity_id": "a5",
            "student_id": "std-1",
            "course_id": "crs-1",
            "activity_type": "RESOURCE_DOWNLOADED",
            "occurred_at": "2026-10-03T10:06:00Z",
            "metadata": '{"attachment_id": "att-1", "file_name": "slides.pdf"}',
        },
        {
            "activity_id": "a6",
            "student_id": "std-1",
            "course_id": "crs-1",
            "activity_type": "QUIZ_STARTED",
            "occurred_at": "2026-10-05T11:00:00Z",
            "metadata": '{"quizId": "qz-1"}',
        },
        {
            "activity_id": "a7",
            "student_id": "std-1",
            "course_id": "crs-1",
            "activity_type": "QUIZ_SUBMITTED",
            "occurred_at": "2026-10-05T11:03:00Z",
            "metadata": '{"score": 90.0, "passed": true, "durationSeconds": 180}',
        },
        {
            "activity_id": "a8",
            "student_id": "std-1",
            "course_id": "crs-1",
            "activity_type": "VIDEO_WATCHED",
            "occurred_at": "2026-10-05T11:10:00Z",
            "metadata": "not-valid-json",
        },
    ])

    result = agg.aggregate(
        enrollments_df=enrollments,
        curriculum_df=curriculum,
        progress_df=empty_df,
        quiz_df=empty_df,
        assignment_df=empty_df,
        discussions_df=empty_df,
        comments_df=empty_df,
        certificates_df=empty_df,
        reviews_df=empty_df,
        notes_df=empty_df,
        activities_df=activities,
    )

    row = result.iloc[0]
    assert row["total_learning_events_count"] == 8
    assert row["active_learning_days_count"] == 3  # Oct 2, Oct 3, Oct 5
    assert row["lesson_views_count"] == 2  # Reading flush excluded
    assert row["video_watch_seconds"] == 240
    assert row["text_reading_seconds"] == 95
    assert row["quiz_duration_seconds"] == 180
    assert row["total_study_time_seconds"] == 515
    assert row["resource_downloads_count"] == 1
    assert row["quiz_starts_count"] == 1
    assert "2026-10-05" in str(row["last_activity_at"])
