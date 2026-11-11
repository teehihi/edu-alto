"""
Unit and schema-invariant tests for the deterministic synthetic cohort seeder.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys
from typing import Any, Dict, List

import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.academic_pipeline.aggregators import AcademicAggregator
from scripts.academic_pipeline.config import DatabaseConfig
from scripts.data_pipeline.seed_dev_cohort import (
    COHORT_INSTRUCTOR_DOMAIN,
    COHORT_SLUG_PREFIX,
    COHORT_STUDENT_DOMAIN,
    build_arg_parser,
    build_cohort_dataset,
    parse_reference_datetime,
    validate_target_host,
)


def test_validate_target_host_blocks_remote_unless_explicitly_allowed() -> None:
    validate_target_host(DatabaseConfig(host="localhost"))
    validate_target_host(DatabaseConfig(host="127.0.0.1"))

    with pytest.raises(ValueError, match="Refusing to seed non-local"):
        validate_target_host(DatabaseConfig(host="prod-db.internal"))

    validate_target_host(DatabaseConfig(host="prod-db.internal"), allow_remote=True)


def test_build_cohort_dataset_is_deterministic() -> None:
    ref_now = datetime(2026, 11, 11, 6, 30, 0, tzinfo=timezone.utc)
    ds_a = build_cohort_dataset(n_students=50, seed=42, reference_now=ref_now)
    ds_b = build_cohort_dataset(n_students=50, seed=42, reference_now=ref_now)

    assert len(ds_a.students) == 50
    assert [s["id"] for s in ds_a.students] == [s["id"] for s in ds_b.students]
    assert [e["id"] for e in ds_a.enrollments] == [e["id"] for e in ds_b.enrollments]
    assert [a["id"] for a in ds_a.learning_activities] == [a["id"] for a in ds_b.learning_activities]
    assert ds_a.persona_summary == ds_b.persona_summary


def test_cohort_respects_integrity_and_schema_invariants() -> None:
    ref_now = datetime(2026, 11, 11, 6, 30, 0, tzinfo=timezone.utc)
    ds = build_cohort_dataset(n_students=150, seed=42, reference_now=ref_now)

    # Namespace isolation for manual dev data preservation
    assert all(s["email"].endswith(COHORT_STUDENT_DOMAIN) for s in ds.students)
    assert all(i["email"].endswith(COHORT_INSTRUCTOR_DOMAIN) for i in ds.instructors)
    assert all(c["slug"].startswith(COHORT_SLUG_PREFIX) for c in ds.courses)

    # Foreign key consistency between course and assignment instructor
    course_instructor = {c["id"]: c["instructor_id"] for c in ds.courses}
    for asn in ds.assignments:
        assert asn["instructor_id"] == course_instructor[asn["course_id"]]
    assert {float(a["max_score"]) for a in ds.assignments} == {10.0, 100.0}

    # Submission grade-pair invariant: score, graded_by, graded_at are all NULL or all non-NULL
    ungraded_count = 0
    graded_count = 0
    for sub in ds.assignment_submissions:
        fields = (sub["score"] is None, sub["graded_by"] is None, sub["graded_at"] is None)
        assert len(set(fields)) == 1
        if fields[0]:
            ungraded_count += 1
        else:
            graded_count += 1
    assert graded_count > 0
    assert ungraded_count > 0

    # Unique primary keys and non-null (source_id, activity_type) uniqueness
    act_ids = [a["id"] for a in ds.learning_activities]
    assert len(act_ids) == len(set(act_ids))

    source_pairs = [
        (a["source_id"], a["activity_type"])
        for a in ds.learning_activities
        if a["source_id"] is not None
    ]
    assert len(source_pairs) == len(set(source_pairs))

    # Every activity timestamp must be strictly <= reference_now
    for a in ds.learning_activities:
        assert a["occurred_at"] <= ref_now

    # Instructor discussion comments must NOT leak into learning_activities
    instructor_ids = {i["id"] for i in ds.instructors}
    inst_comment_ids = {c["id"] for c in ds.discussion_comments if c["author_id"] in instructor_ids}
    assert len(inst_comment_ids) > 0
    assert not any(a["source_id"] in inst_comment_ids for a in ds.learning_activities)

    # Persona mix populated across all personas
    assert all(count > 0 for count in ds.persona_summary.values())


def test_cohort_feeds_academic_aggregator_all_five_statuses() -> None:
    ref_now = datetime(2026, 11, 11, 6, 30, 0, tzinfo=timezone.utc)
    ds = build_cohort_dataset(n_students=160, seed=42, reference_now=ref_now)

    course_by_id = {c["id"]: c for c in ds.courses}
    sec_course = {s["id"]: s["course_id"] for s in ds.sections}
    les_by_id = {l["id"]: l for l in ds.lessons}
    quiz_lesson = {q["id"]: q["lesson_id"] for q in ds.quizzes}
    asn_by_id = {a["id"]: a for a in ds.assignments}
    disc_course = {d["id"]: d["course_id"] for d in ds.discussions}
    student_by_id = {s["id"]: s for s in ds.students}

    # Build curriculum catalog equivalent to extract_course_curriculum_catalog
    curr_rows: List[Dict[str, Any]] = []
    for c in ds.courses:
        c_lessons = [l for l in ds.lessons if sec_course[l["section_id"]] == c["id"]]
        c_quizzes = [q for q in ds.quizzes if sec_course[les_by_id[q["lesson_id"]]["section_id"]] == c["id"]]
        c_asns = [a for a in ds.assignments if a["course_id"] == c["id"]]
        curr_rows.append({
            "course_id": str(c["id"]),
            "course_title": c["title"],
            "course_slug": c["slug"],
            "course_level": c["level"],
            "course_status": c["status"],
            "total_lessons": len(c_lessons),
            "total_duration_seconds": sum(l["duration_seconds"] for l in c_lessons),
            "total_quizzes": len(c_quizzes),
            "total_assignments": len(c_asns),
        })

    enroll_df = pd.DataFrame([
        {
            "enrollment_id": str(e["id"]),
            "student_id": str(e["student_id"]),
            "student_name": student_by_id[e["student_id"]]["full_name"],
            "student_email": student_by_id[e["student_id"]]["email"],
            "course_id": str(e["course_id"]),
            "course_title": course_by_id[e["course_id"]]["title"],
            "course_slug": course_by_id[e["course_id"]]["slug"],
            "course_level": course_by_id[e["course_id"]]["level"],
            "enrollment_status": e["status"],
            "enrolled_at": e["enrolled_at"].isoformat(),
        }
        for e in ds.enrollments
    ])

    enroll_student = {e["id"]: e["student_id"] for e in ds.enrollments}
    progress_df = pd.DataFrame([
        {
            "student_id": str(enroll_student[p["enrollment_id"]]),
            "course_id": str(p["course_id"]),
            "lesson_id": str(p["lesson_id"]),
            "completed_at": p["completed_at"].isoformat(),
            "duration_seconds": les_by_id[p["lesson_id"]]["duration_seconds"],
        }
        for p in ds.learning_progress
    ])

    quiz_df = pd.DataFrame([
        {
            "attempt_id": str(qa["id"]),
            "student_id": str(qa["student_id"]),
            "course_id": str(sec_course[les_by_id[quiz_lesson[qa["quiz_id"]]]["section_id"]]),
            "quiz_id": str(qa["quiz_id"]),
            "score": qa["score"],
            "correct_answers": qa["correct_answers"],
            "total_questions": qa["total_questions"],
            "passed": qa["passed"],
            "submitted_at": qa["submitted_at"].isoformat(),
        }
        for qa in ds.quiz_attempts
    ])

    assign_df = pd.DataFrame([
        {
            "submission_id": str(sub["id"]),
            "student_id": str(sub["student_id"]),
            "course_id": str(asn_by_id[sub["assignment_id"]]["course_id"]),
            "assignment_id": str(sub["assignment_id"]),
            "submitted_at": sub["submitted_at"].isoformat(),
            "score": sub["score"],
            "max_score": asn_by_id[sub["assignment_id"]]["max_score"],
            "due_at": asn_by_id[sub["assignment_id"]]["due_at"].isoformat(),
            "is_on_time": sub["submitted_at"] <= asn_by_id[sub["assignment_id"]]["due_at"],
        }
        for sub in ds.assignment_submissions
    ])

    disc_df = pd.DataFrame([
        {
            "discussion_id": str(d["id"]),
            "student_id": str(d["author_id"]),
            "course_id": str(d["course_id"]),
            "video_timestamp_seconds": d["video_timestamp_seconds"],
            "created_at": d["created_at"].isoformat(),
        }
        for d in ds.discussions
    ])

    comm_df = pd.DataFrame([
        {
            "comment_id": str(dc["id"]),
            "student_id": str(dc["author_id"]),
            "course_id": str(disc_course[dc["discussion_id"]]),
            "created_at": dc["created_at"].isoformat(),
        }
        for dc in ds.discussion_comments
    ])

    cert_df = pd.DataFrame([
        {
            "certificate_id": str(c["id"]),
            "student_id": str(c["student_id"]),
            "course_id": str(c["course_id"]),
            "certificate_number": c["certificate_number"],
            "issued_at": c["issued_at"].isoformat(),
        }
        for c in ds.certificates
    ])

    rev_df = pd.DataFrame([
        {
            "review_id": str(r["id"]),
            "student_id": str(r["student_id"]),
            "course_id": str(r["course_id"]),
            "rating": r["rating"],
            "created_at": r["created_at"].isoformat(),
        }
        for r in ds.course_reviews
    ])

    notes_df = pd.DataFrame([
        {
            "note_id": str(n["id"]),
            "student_id": str(n["user_id"]),
            "course_id": str(sec_course[les_by_id[n["lesson_id"]]["section_id"]]),
            "created_at": n["created_at"].isoformat(),
        }
        for n in ds.learning_notes
    ])

    act_df = pd.DataFrame([
        {
            "activity_id": str(a["id"]),
            "student_id": str(a["student_id"]),
            "course_id": str(a["course_id"]),
            "section_id": str(a["section_id"]) if a["section_id"] else None,
            "lesson_id": str(a["lesson_id"]) if a["lesson_id"] else None,
            "activity_type": a["activity_type"],
            "source_id": str(a["source_id"]) if a["source_id"] else None,
            "occurred_at": a["occurred_at"].isoformat(),
            "metadata": a["metadata_json"],
        }
        for a in ds.learning_activities
    ])

    agg_df = AcademicAggregator(reference_time=ref_now).aggregate(
        enrollments_df=enroll_df,
        curriculum_df=pd.DataFrame(curr_rows),
        progress_df=progress_df,
        quiz_df=quiz_df,
        assignment_df=assign_df,
        discussions_df=disc_df,
        comments_df=comm_df,
        certificates_df=cert_df,
        reviews_df=rev_df,
        notes_df=notes_df,
        activities_df=act_df,
    )

    assert len(agg_df) == len(ds.enrollments)
    assert set(agg_df["academic_status"].unique()) == {"COMPLETED", "EXCELLING", "ON_TRACK", "AT_RISK", "JUST_STARTED"}
    assert (agg_df["video_watch_seconds"] > 0).any()
    assert (agg_df["text_reading_seconds"] > 0).any()
    assert (agg_df["quiz_duration_seconds"] > 0).any()
    assert (agg_df["resource_downloads_count"] > 0).any()
    assert (agg_df["active_learning_days_count"] > 0).all()


def test_parse_reference_datetime_and_cli_args() -> None:
    parsed_z = parse_reference_datetime("2026-11-11T07:00:00Z")
    parsed_vn = parse_reference_datetime("2026-11-11T14:00:00+07:00")
    parsed_naive = parse_reference_datetime("2026-11-11T07:00:00")

    expected = datetime(2026, 11, 11, 7, 0, 0, tzinfo=timezone.utc)
    assert parsed_z == expected
    assert parsed_vn == expected
    assert parsed_naive == expected

    args = build_arg_parser().parse_args(["--students", "120", "--seed", "7", "--reference-now", "2026-11-11T07:00:00Z"])
    assert args.students == 120
    assert args.seed == 7
    assert args.reference_now == "2026-11-11T07:00:00Z"
