"""
Unit and Integration Tests for EduAlto Machine Learning Pipeline (EDU-109..113)
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest

from scripts.ml_pipeline.feature_pipeline import (
    FEATURE_COLUMNS,
    LEAKAGE_TARGET_COLUMNS,
    extract_features,
    split_train_test_by_student,
)
from scripts.ml_pipeline.inference import StudentRiskPredictor
from scripts.ml_pipeline.train_and_evaluate import train_and_benchmark


@pytest.fixture
def sample_raw_data() -> pd.DataFrame:
    """Create a minimal synthetic dataset simulating multiple enrollments per student."""
    return pd.DataFrame([
        {
            "student_id": f"std-00{i}",
            "course_id": "crs-01",
            "student_name": f"Học viên {i}",
            "student_email": f"student{i}@edualto.local",
            "course_title": "Python Data",
            "total_study_time_seconds": 12000 if i % 2 == 0 else 600,
            "active_learning_days_count": 8 if i % 2 == 0 else 1,
            "lesson_views_count": 10 if i % 2 == 0 else 2,
            "video_watch_seconds": 6000 if i % 2 == 0 else 300,
            "text_reading_seconds": 3000 if i % 2 == 0 else 100,
            "quiz_duration_seconds": 1200 if i % 2 == 0 else 100,
            "resource_downloads_count": 2 if i % 2 == 0 else 0,
            "quiz_starts_count": 3 if i % 2 == 0 else 1,
            "total_quiz_attempts": 3 if i % 2 == 0 else 1,
            "avg_quiz_score": 8.5 if i % 2 == 0 else 2.5,
            "max_quiz_score": 9.0 if i % 2 == 0 else 3.0,
            "quizzes_attempted_count": 2 if i % 2 == 0 else 1,
            "quizzes_passed_count": 2 if i % 2 == 0 else 0,
            "quiz_accuracy_pct": 85.0 if i % 2 == 0 else 25.0,
            "assignments_submitted_count": 2 if i % 2 == 0 else 0,
            "avg_assignment_score": 8.0 if i % 2 == 0 else 0.0,
            "submissions_on_time_count": 2 if i % 2 == 0 else 0,
            "submissions_late_count": 0,
            "on_time_submission_rate_pct": 100.0 if i % 2 == 0 else 0.0,
            "discussions_count": 1 if i % 2 == 0 else 0,
            "learning_notes_count": 2 if i % 2 == 0 else 0,
            "days_since_last_activity": 1 if i % 2 == 0 else 22,
            "academic_status": "COMPLETED" if i % 2 == 0 else "AT_RISK",
            "has_certificate": True if i % 2 == 0 else False,
            "completed_lessons_count": 10 if i % 2 == 0 else 1,
            "lesson_completion_rate_pct": 100.0 if i % 2 == 0 else 10.0,
        }
        for i in range(1, 21)
    ])


def test_feature_pipeline_guards_against_leakage(sample_raw_data: pd.DataFrame):
    """Verify that NO target or future-outcome columns leak into FEATURE_COLUMNS."""
    for leak_col in LEAKAGE_TARGET_COLUMNS:
        assert leak_col not in FEATURE_COLUMNS, f"Data leakage: {leak_col} present in FEATURE_COLUMNS"

    features_df = extract_features(sample_raw_data)
    for feat in FEATURE_COLUMNS:
        assert feat in features_df.columns, f"Missing feature: {feat}"
    assert "target_at_risk" in features_df.columns
    assert "target_completed" in features_df.columns


def test_group_shuffle_split_is_disjoint_by_student(sample_raw_data: pd.DataFrame):
    """Verify that no student appears in both train and test partitions."""
    features_df = extract_features(sample_raw_data)
    train_df, test_df = split_train_test_by_student(features_df, test_size=0.30, random_state=42)

    train_students = set(train_df["student_id"])
    test_students = set(test_df["student_id"])

    assert len(train_students) > 0
    assert len(test_students) > 0
    assert train_students.isdisjoint(test_students), "Students leaked across train and test partitions!"


def test_train_and_evaluate_generates_valid_artifacts(sample_raw_data: pd.DataFrame, tmp_path: Path):
    """Verify training runs, generates baseline and champion results, and saves metadata."""
    features_df = extract_features(sample_raw_data)
    train_df, test_df = split_train_test_by_student(features_df, test_size=0.30, random_state=42)

    models_dir = tmp_path / "models"
    metadata = train_and_benchmark(train_df, test_df, models_dir=models_dir)

    assert metadata["champion_model"] == "LightGBM"
    assert len(metadata["benchmark_comparison"]) == 3
    assert (models_dir / "lgbm_at_risk_model.joblib").exists()
    assert (models_dir / "lgbm_at_risk_model.txt").exists()
    assert (models_dir / "decision_rules.json").exists()
    assert (models_dir / "model_metadata.json").exists()


def test_inference_predictor_outputs_concise_contract():
    """Verify predictor generates clean, concise, non-verbose output with correct badges."""
    predictor = StudentRiskPredictor()

    # Active student
    high_perf = {
        "days_since_last_activity": 1,
        "avg_quiz_score": 9.5,
        "active_learning_days_count": 10,
        "total_study_time_seconds": 20000,
        "quizzes_passed_count": 3,
        "total_quiz_attempts": 3,
    }
    result_high = predictor.predict(high_perf)
    assert result_high["riskLevel"] == "LOW"
    assert result_high["completionPercentage"] >= 70
    assert result_high["statusBadge"] in ["Rất tốt", "Đúng tiến độ"]
    assert len(result_high["primaryFactorLabel"]) <= 20  # Concise label check!

    # At-risk student (inactive 15 days, low scores)
    at_risk = {
        "days_since_last_activity": 15,
        "avg_quiz_score": 3.0,
        "active_learning_days_count": 1,
        "total_study_time_seconds": 600,
        "total_quiz_attempts": 1,
        "quizzes_passed_count": 0,
    }
    result_risk = predictor.predict(at_risk)
    assert result_risk["riskLevel"] in ["HIGH", "MEDIUM"]
    assert result_risk["atRiskProbability"] >= 0.35
    assert result_risk["statusBadge"] in ["Cần hỗ trợ", "Cần theo dõi"]
    assert "Nghỉ" in result_risk["primaryFactorLabel"] or "Quiz" in result_risk["primaryFactorLabel"]
