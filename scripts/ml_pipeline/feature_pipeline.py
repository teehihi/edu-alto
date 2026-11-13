"""
EduAlto Machine Learning Pipeline - Feature Engineering (EDU-109)

Extracts behavioral, temporal, and engagement features from raw / cleaned
learning datasets with rigorous Data Leakage prevention and Student-level
group splitting (GroupShuffleSplit).
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ml_feature_pipeline")

FEATURE_COLUMNS: List[str] = [
    "total_study_time_seconds",
    "active_learning_days_count",
    "lesson_views_count",
    "video_watch_seconds",
    "text_reading_seconds",
    "quiz_duration_seconds",
    "resource_downloads_count",
    "quiz_starts_count",
    "total_quiz_attempts",
    "avg_quiz_score",
    "max_quiz_score",
    "quizzes_attempted_count",
    "quizzes_passed_count",
    "quiz_accuracy_pct",
    "assignments_submitted_count",
    "avg_assignment_score",
    "submissions_on_time_count",
    "submissions_late_count",
    "on_time_submission_rate_pct",
    "discussions_count",
    "learning_notes_count",
    "days_since_last_activity",
]

IDENTIFIER_COLUMNS: List[str] = [
    "student_id",
    "course_id",
    "student_name",
    "student_email",
    "course_title",
]

# Strict list of columns that must NEVER enter the feature matrix X
LEAKAGE_TARGET_COLUMNS: List[str] = [
    "has_certificate",
    "certificate_number",
    "certificate_issued_at",
    "is_course_completed",
    "completed_lessons_count",
    "lesson_completion_rate_pct",
    "completed_duration_seconds",
    "duration_completion_rate_pct",
    "academic_engagement_score",
    "academic_status",
]


def load_raw_dataset(file_path: Path) -> pd.DataFrame:
    """Load learning dataset from CSV, handling BOM and data types."""
    if not file_path.exists():
        raise FileNotFoundError(f"Input dataset not found at {file_path}")
    df = pd.read_csv(file_path)
    logger.info("Loaded raw dataset from %s (rows=%d, cols=%d)", file_path, len(df), len(df.columns))
    return df


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract, clean, and validate observable features.
    If the dataset is an assessment-level CSV (like cleaned_learning_dataset.csv),
    aggregate it to the (student_id, course_id) level first.
    """
    if "assessment_type" in df.columns and df.duplicated(subset=["student_id", "course_id"]).any():
        logger.info("Aggregating assessment-level rows to unique (student_id, course_id) pairs...")
        # Compute quiz & assignment aggregates from assessment rows
        quiz_mask = df["assessment_type"] == "QUIZ"
        asn_mask = df["assessment_type"] == "ASSIGNMENT"

        quizzes = df[quiz_mask].groupby(["student_id", "course_id"]).agg(
            total_quiz_attempts=("record_id", "count"),
            quizzes_attempted_count=("assessment_id", "nunique"),
            quizzes_passed_count=("is_passed", lambda s: s.astype(bool).sum()),
            avg_quiz_score=("score_scale_10", "mean"),
            max_quiz_score=("score_scale_10", "max"),
        ).reset_index()

        assigns = df[asn_mask].groupby(["student_id", "course_id"]).agg(
            assignments_submitted_count=("record_id", "count"),
            avg_assignment_score=("score_scale_10", "mean"),
        ).reset_index()

        grouped = df.groupby(["student_id", "course_id"], as_index=False).first()
        grouped = grouped.drop(
            columns=[
                c for c in [
                    "total_quiz_attempts", "quizzes_attempted_count", "quizzes_passed_count",
                    "avg_quiz_score", "max_quiz_score", "assignments_submitted_count",
                    "avg_assignment_score"
                ] if c in grouped.columns
            ]
        )
        grouped = grouped.merge(quizzes, on=["student_id", "course_id"], how="left")
        grouped = grouped.merge(assigns, on=["student_id", "course_id"], how="left")

        # Recency gap calculation if timestamps present
        if "last_learning_activity_at" in grouped.columns:
            last_ts = pd.to_datetime(grouped["last_learning_activity_at"], errors="coerce")
            ref_ts = last_ts.max()
            if pd.notna(ref_ts):
                grouped["days_since_last_activity"] = (ref_ts - last_ts).dt.days.fillna(0)
    elif df.duplicated(subset=["student_id", "course_id"]).any():
        logger.info("Aggregating duplicate rows to unique (student_id, course_id) pairs...")
        grouped = df.groupby(["student_id", "course_id"], as_index=False).first()
    else:
        grouped = df.copy()

    # Ensure required feature columns exist, imputing 0 for missing ones
    for col in FEATURE_COLUMNS:
        if col not in grouped.columns:
            logger.warning("Feature column '%s' missing from dataset, defaulting to 0.0", col)
            grouped[col] = 0.0
        else:
            grouped[col] = pd.to_numeric(grouped[col], errors="coerce").fillna(0.0)

    # Derive targets
    if "academic_status" in grouped.columns:
        # AT_RISK = 1, others (ON_TRACK, COMPLETED, EXCELLING, JUST_STARTED) = 0
        grouped["target_at_risk"] = (grouped["academic_status"] == "AT_RISK").astype(int)
        # COMPLETION = 1 if COMPLETED or EXCELLING
        grouped["target_completed"] = grouped["academic_status"].isin(["COMPLETED", "EXCELLING"]).astype(int)
    else:
        # Fallback if binary target already present
        grouped["target_at_risk"] = grouped.get("target_at_risk", 0)
        grouped["target_completed"] = grouped.get("target_completed", 0)

    # Sanity check: Ensure NO leakage columns exist in the feature set
    for leak_col in LEAKAGE_TARGET_COLUMNS:
        if leak_col in FEATURE_COLUMNS:
            raise ValueError(f"CRITICAL: Leakage column {leak_col} detected in FEATURE_COLUMNS!")

    logger.info(
        "Extracted %d feature columns for %d enrollments (At-Risk: %d, Completed: %d)",
        len(FEATURE_COLUMNS),
        len(grouped),
        grouped["target_at_risk"].sum(),
        grouped["target_completed"].sum(),
    )
    return grouped


def split_train_test_by_student(
    df: pd.DataFrame,
    test_size: float = 0.20,
    random_state: int = 42,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split dataset using GroupShuffleSplit on student_id to prevent
    the same student from leaking across train and test sets.
    """
    groups = df["student_id"]
    gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
    train_idx, test_idx = next(gss.split(df, groups=groups))

    train_df = df.iloc[train_idx].copy().reset_index(drop=True)
    test_df = df.iloc[test_idx].copy().reset_index(drop=True)

    n_train_students = train_df["student_id"].nunique()
    n_test_students = test_df["student_id"].nunique()

    # Verify 0 overlap between student groups
    overlap = set(train_df["student_id"]).intersection(set(test_df["student_id"]))
    if overlap:
        raise RuntimeError(f"Group split error: {len(overlap)} students leaked across train and test!")

    logger.info(
        "Train set: %d rows (%d unique students), At-Risk rate: %.2f%%",
        len(train_df),
        n_train_students,
        train_df["target_at_risk"].mean() * 100,
    )
    logger.info(
        "Test set:  %d rows (%d unique students), At-Risk rate: %.2f%%",
        len(test_df),
        n_test_students,
        test_df["target_at_risk"].mean() * 100,
    )
    return train_df, test_df


def run_feature_pipeline(
    input_path: Path,
    train_out: Path,
    test_out: Path,
    test_size: float = 0.20,
    random_state: int = 42,
) -> Dict[str, any]:
    """Execute end-to-end feature extraction and dataset preparation."""
    raw_df = load_raw_dataset(input_path)
    processed_df = extract_features(raw_df)
    train_df, test_df = split_train_test_by_student(
        processed_df, test_size=test_size, random_state=random_state
    )

    # Save to disk
    train_out.parent.mkdir(parents=True, exist_ok=True)
    test_out.parent.mkdir(parents=True, exist_ok=True)

    output_cols = IDENTIFIER_COLUMNS + FEATURE_COLUMNS + ["target_at_risk", "target_completed"]
    available_cols = [c for c in output_cols if c in train_df.columns]

    train_df[available_cols].to_csv(train_out, index=False)
    test_df[available_cols].to_csv(test_out, index=False)

    metadata = {
        "source_dataset": str(input_path),
        "total_enrollments": len(processed_df),
        "feature_count": len(FEATURE_COLUMNS),
        "feature_columns": FEATURE_COLUMNS,
        "train_rows": len(train_df),
        "train_students": int(train_df["student_id"].nunique()),
        "test_rows": len(test_df),
        "test_students": int(test_df["student_id"].nunique()),
        "test_size": test_size,
        "random_state": random_state,
        "train_at_risk_count": int(train_df["target_at_risk"].sum()),
        "test_at_risk_count": int(test_df["target_at_risk"].sum()),
    }

    meta_path = train_out.parent / "ml_features_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    logger.info("Saved train features to %s", train_out)
    logger.info("Saved test features to %s", test_out)
    logger.info("Saved metadata to %s", meta_path)
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description="EduAlto ML Feature Engineering Pipeline (EDU-109)")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("data/academic_exports/student_course_academic_summary.csv"),
        help="Path to source summary CSV",
    )
    parser.add_argument(
        "--train-out",
        type=Path,
        default=Path("data/ml_features_train.csv"),
        help="Path to save train features CSV",
    )
    parser.add_argument(
        "--test-out",
        type=Path,
        default=Path("data/ml_features_test.csv"),
        help="Path to save test features CSV",
    )
    parser.add_argument("--test-size", type=float, default=0.20, help="Test size fraction")
    parser.add_argument("--random-state", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    run_feature_pipeline(
        input_path=args.input,
        train_out=args.train_out,
        test_out=args.test_out,
        test_size=args.test_size,
        random_state=args.random_state,
    )


if __name__ == "__main__":
    main()
