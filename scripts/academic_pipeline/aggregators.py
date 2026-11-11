"""
Academic Data Aggregation Engine.
Aggregates multidimensional learning telemetry grouped by Student and Course/Subject.
Calculates completion rates, assessment proficiencies, engagement indices, and risk indicators.
Supports merging incremental updates into historical datasets.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger("academic_pipeline.aggregators")


class AcademicAggregator:
    """Aggregates raw extracted learning records into student-course analytical profiles."""

    def __init__(self, reference_time: Optional[datetime] = None):
        self.now = reference_time or datetime.now(timezone.utc)

    def aggregate(
        self,
        enrollments_df: pd.DataFrame,
        curriculum_df: pd.DataFrame,
        progress_df: pd.DataFrame,
        quiz_df: pd.DataFrame,
        assignment_df: pd.DataFrame,
        discussions_df: pd.DataFrame,
        comments_df: pd.DataFrame,
        certificates_df: pd.DataFrame,
        reviews_df: pd.DataFrame,
        notes_df: pd.DataFrame,
        activities_df: Optional[pd.DataFrame] = None,
    ) -> pd.DataFrame:
        """
        Aggregate all academic telemetry grouped by (student_id, course_id).
        Returns DataFrame with comprehensive student-course academic metrics.
        """
        if enrollments_df.empty:
            logger.info("No enrollments to aggregate.")
            return pd.DataFrame()

        activities_input = activities_df if activities_df is not None else pd.DataFrame()

        # Ensure student_id and course_id are strings for consistent joining
        for df in [
            enrollments_df, curriculum_df, progress_df, quiz_df,
            assignment_df, discussions_df, comments_df,
            certificates_df, reviews_df, notes_df, activities_input
        ]:
            if not df.empty:
                if "student_id" in df.columns:
                    df["student_id"] = df["student_id"].astype(str)
                if "course_id" in df.columns:
                    df["course_id"] = df["course_id"].astype(str)

        # 1. Base: Start with enrollments and merge curriculum baseline
        base = enrollments_df.copy()
        curriculum = curriculum_df.copy()
        if not curriculum.empty:
            curriculum = curriculum[["course_id", "total_lessons", "total_duration_seconds", "total_quizzes", "total_assignments"]].drop_duplicates("course_id")
            base = base.merge(curriculum, on="course_id", how="left")
        else:
            base["total_lessons"] = 0
            base["total_duration_seconds"] = 0
            base["total_quizzes"] = 0
            base["total_assignments"] = 0

        base["total_lessons"] = base["total_lessons"].fillna(0).astype(int)
        base["total_duration_seconds"] = base["total_duration_seconds"].fillna(0).astype(int)
        base["total_quizzes"] = base["total_quizzes"].fillna(0).astype(int)
        base["total_assignments"] = base["total_assignments"].fillna(0).astype(int)

        # 2. Lesson Progress Aggregation
        prog_metrics = self._aggregate_progress(progress_df)
        base = base.merge(prog_metrics, on=["student_id", "course_id"], how="left")
        base["completed_lessons_count"] = base["completed_lessons_count"].fillna(0).astype(int)
        base["completed_duration_seconds"] = base["completed_duration_seconds"].fillna(0).astype(int)

        base["lesson_completion_rate_pct"] = np.where(
            base["total_lessons"] > 0,
            np.minimum(100.0, np.round((base["completed_lessons_count"] / base["total_lessons"]) * 100.0, 2)),
            0.0,
        )
        base["duration_completion_rate_pct"] = np.where(
            base["total_duration_seconds"] > 0,
            np.minimum(100.0, np.round((base["completed_duration_seconds"] / base["total_duration_seconds"]) * 100.0, 2)),
            0.0,
        )

        # 3. Quiz Attempts Aggregation
        quiz_metrics = self._aggregate_quizzes(quiz_df)
        base = base.merge(quiz_metrics, on=["student_id", "course_id"], how="left")
        base["quizzes_attempted_count"] = base["quizzes_attempted_count"].fillna(0).astype(int)
        base["quizzes_passed_count"] = base["quizzes_passed_count"].fillna(0).astype(int)
        base["total_quiz_attempts"] = base["total_quiz_attempts"].fillna(0).astype(int)
        base["avg_quiz_score"] = base["avg_quiz_score"].fillna(0.0).round(2)
        base["max_quiz_score"] = base["max_quiz_score"].fillna(0.0).round(2)
        base["total_quiz_questions_answered"] = base["total_quiz_questions_answered"].fillna(0).astype(int)
        base["total_quiz_correct_answers"] = base["total_quiz_correct_answers"].fillna(0).astype(int)
        base["quiz_accuracy_pct"] = np.where(
            base["total_quiz_questions_answered"] > 0,
            np.round((base["total_quiz_correct_answers"] / base["total_quiz_questions_answered"]) * 100.0, 2),
            0.0,
        )
        base["quiz_coverage_pct"] = np.where(
            base["total_quizzes"] > 0,
            np.minimum(100.0, np.round((base["quizzes_attempted_count"] / base["total_quizzes"]) * 100.0, 2)),
            0.0,
        )

        # 4. Assignment Submissions Aggregation
        assign_metrics = self._aggregate_assignments(assignment_df)
        base = base.merge(assign_metrics, on=["student_id", "course_id"], how="left")
        base["assignments_submitted_count"] = base["assignments_submitted_count"].fillna(0).astype(int)
        base["assignments_graded_count"] = base["assignments_graded_count"].fillna(0).astype(int)
        base["avg_assignment_score"] = base["avg_assignment_score"].fillna(0.0).round(2)
        base["avg_assignment_score_pct"] = base["avg_assignment_score_pct"].fillna(0.0).round(2)
        base["submissions_on_time_count"] = base["submissions_on_time_count"].fillna(0).astype(int)
        base["submissions_late_count"] = base["submissions_late_count"].fillna(0).astype(int)
        base["assignment_coverage_pct"] = np.where(
            base["total_assignments"] > 0,
            np.minimum(100.0, np.round((base["assignments_submitted_count"] / base["total_assignments"]) * 100.0, 2)),
            0.0,
        )
        base["on_time_submission_rate_pct"] = np.where(
            base["assignments_submitted_count"] > 0,
            np.round((base["submissions_on_time_count"] / base["assignments_submitted_count"]) * 100.0, 2),
            0.0,
        )

        # 5. Social & Interactions Aggregation
        disc_metrics = self._aggregate_discussions(discussions_df, comments_df)
        base = base.merge(disc_metrics, on=["student_id", "course_id"], how="left")
        base["discussions_count"] = pd.to_numeric(base["discussions_count"], errors="coerce").fillna(0).astype(int)
        base["video_timestamp_questions_count"] = pd.to_numeric(base["video_timestamp_questions_count"], errors="coerce").fillna(0).astype(int)
        base["discussion_comments_count"] = pd.to_numeric(base["discussion_comments_count"], errors="coerce").fillna(0).astype(int)
        base["total_interactions_count"] = base["discussions_count"] + base["discussion_comments_count"]

        # 6. Learning Notes Aggregation
        notes_metrics = self._aggregate_notes(notes_df)
        base = base.merge(notes_metrics, on=["student_id", "course_id"], how="left")
        base["learning_notes_count"] = pd.to_numeric(base["learning_notes_count"], errors="coerce").fillna(0).astype(int)

        # 7. Reviews Aggregation
        review_metrics = self._aggregate_reviews(reviews_df)
        base = base.merge(review_metrics, on=["student_id", "course_id"], how="left")
        base["has_reviewed_course"] = base["has_reviewed_course"].map(lambda x: True if x is True else False)

        # 8. Certificates Aggregation
        cert_metrics = self._aggregate_certificates(certificates_df)
        base = base.merge(cert_metrics, on=["student_id", "course_id"], how="left")
        base["has_certificate"] = base["has_certificate"].map(lambda x: True if x is True else False)

        # 9. Learning Activities Telemetry Aggregation (V34)
        activity_metrics = self._aggregate_activities(activities_input)
        base = base.merge(activity_metrics, on=["student_id", "course_id"], how="left")
        for col in [
            "total_learning_events_count",
            "active_learning_days_count",
            "lesson_views_count",
            "video_watch_seconds",
            "text_reading_seconds",
            "quiz_duration_seconds",
            "total_study_time_seconds",
            "resource_downloads_count",
            "quiz_starts_count",
        ]:
            base[col] = pd.to_numeric(base[col], errors="coerce").fillna(0).astype(int)

        # 10. Activity Recency & Status
        base = self._calculate_recency_and_engagement(base)

        # Sort cleanly by course_title, student_name
        base = base.sort_values(by=["course_title", "student_name"]).reset_index(drop=True)
        return base

    def _aggregate_progress(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return pd.DataFrame(columns=[
                "student_id", "course_id", "completed_lessons_count",
                "completed_duration_seconds", "first_lesson_completed_at", "last_lesson_completed_at"
            ])
        grouped = df.groupby(["student_id", "course_id"]).agg(
            completed_lessons_count=("lesson_id", "nunique"),
            completed_duration_seconds=("duration_seconds", "sum"),
            first_lesson_completed_at=("completed_at", "min"),
            last_lesson_completed_at=("completed_at", "max"),
        ).reset_index()
        return grouped

    def _aggregate_quizzes(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return pd.DataFrame(columns=[
                "student_id", "course_id", "quizzes_attempted_count", "quizzes_passed_count",
                "total_quiz_attempts", "avg_quiz_score", "max_quiz_score",
                "total_quiz_questions_answered", "total_quiz_correct_answers", "last_quiz_submitted_at"
            ])
        # Unique quizzes attempted & passed
        attempted = df.groupby(["student_id", "course_id"])["quiz_id"].nunique().rename("quizzes_attempted_count")
        passed = df[df["passed"] == True].groupby(["student_id", "course_id"])["quiz_id"].nunique().rename("quizzes_passed_count")
        
        stats = df.groupby(["student_id", "course_id"]).agg(
            total_quiz_attempts=("attempt_id", "count"),
            avg_quiz_score=("score", "mean"),
            max_quiz_score=("score", "max"),
            total_quiz_questions_answered=("total_questions", "sum"),
            total_quiz_correct_answers=("correct_answers", "sum"),
            last_quiz_submitted_at=("submitted_at", "max"),
        )
        merged = stats.join(attempted).join(passed).reset_index()
        merged["quizzes_passed_count"] = merged["quizzes_passed_count"].fillna(0).astype(int)
        return merged

    def _aggregate_assignments(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return pd.DataFrame(columns=[
                "student_id", "course_id", "assignments_submitted_count", "assignments_graded_count",
                "avg_assignment_score", "avg_assignment_score_pct", "submissions_on_time_count",
                "submissions_late_count", "last_assignment_submitted_at"
            ])
        df["score_pct"] = np.where(df["max_score"] > 0, (df["score"] / df["max_score"]) * 100.0, np.nan)
        graded_df = df[df["score"].notna()]

        submitted_cnt = df.groupby(["student_id", "course_id"])["assignment_id"].nunique().rename("assignments_submitted_count")
        graded_cnt = graded_df.groupby(["student_id", "course_id"])["assignment_id"].nunique().rename("assignments_graded_count")
        on_time_cnt = df[df["is_on_time"] == True].groupby(["student_id", "course_id"])["submission_id"].count().rename("submissions_on_time_count")
        late_cnt = df[df["is_on_time"] == False].groupby(["student_id", "course_id"])["submission_id"].count().rename("submissions_late_count")

        stats = df.groupby(["student_id", "course_id"]).agg(
            avg_assignment_score=("score", "mean"),
            avg_assignment_score_pct=("score_pct", "mean"),
            last_assignment_submitted_at=("submitted_at", "max"),
        )
        merged = stats.join(submitted_cnt).join(graded_cnt).join(on_time_cnt).join(late_cnt).reset_index()
        merged["assignments_graded_count"] = merged["assignments_graded_count"].fillna(0).astype(int)
        merged["submissions_on_time_count"] = merged["submissions_on_time_count"].fillna(0).astype(int)
        merged["submissions_late_count"] = merged["submissions_late_count"].fillna(0).astype(int)
        return merged

    def _aggregate_discussions(self, disc_df: pd.DataFrame, comm_df: pd.DataFrame) -> pd.DataFrame:
        cols = ["student_id", "course_id", "discussions_count", "video_timestamp_questions_count", "discussion_comments_count"]
        d_grouped = pd.DataFrame()
        if not disc_df.empty:
            disc_df["has_timestamp"] = disc_df["video_timestamp_seconds"].notna()
            d_grouped = disc_df.groupby(["student_id", "course_id"]).agg(
                discussions_count=("discussion_id", "count"),
                video_timestamp_questions_count=("has_timestamp", "sum"),
            ).reset_index()

        c_grouped = pd.DataFrame()
        if not comm_df.empty:
            c_grouped = comm_df.groupby(["student_id", "course_id"]).agg(
                discussion_comments_count=("comment_id", "count"),
            ).reset_index()

        if d_grouped.empty and c_grouped.empty:
            return pd.DataFrame(columns=cols)
        if d_grouped.empty:
            c_grouped["discussions_count"] = 0
            c_grouped["video_timestamp_questions_count"] = 0
            return c_grouped
        if c_grouped.empty:
            d_grouped["discussion_comments_count"] = 0
            return d_grouped

        merged = pd.merge(d_grouped, c_grouped, on=["student_id", "course_id"], how="outer").fillna(0)
        return merged

    def _aggregate_notes(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return pd.DataFrame(columns=["student_id", "course_id", "learning_notes_count"])
        return df.groupby(["student_id", "course_id"]).agg(
            learning_notes_count=("note_id", "count")
        ).reset_index()

    def _aggregate_reviews(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return pd.DataFrame(columns=["student_id", "course_id", "has_reviewed_course", "review_rating"])
        grouped = df.groupby(["student_id", "course_id"]).agg(
            review_rating=("rating", "mean"),
        ).reset_index()
        grouped["has_reviewed_course"] = True
        grouped["review_rating"] = grouped["review_rating"].round(1)
        return grouped

    def _aggregate_certificates(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return pd.DataFrame(columns=["student_id", "course_id", "has_certificate", "certificate_number", "certificate_issued_at"])
        grouped = df.groupby(["student_id", "course_id"]).agg(
            certificate_number=("certificate_number", "first"),
            certificate_issued_at=("issued_at", "first"),
        ).reset_index()
        grouped["has_certificate"] = True
        return grouped

    @staticmethod
    def _parse_utc_series(series: pd.Series) -> pd.Series:
        try:
            return pd.to_datetime(series, errors="coerce", utc=True, format="ISO8601")
        except Exception:
            return pd.to_datetime(series, errors="coerce", utc=True)

    @staticmethod
    def _parse_metadata(raw_value: Any) -> Dict[str, Any]:
        if isinstance(raw_value, dict):
            return raw_value
        if isinstance(raw_value, str):
            trimmed = raw_value.strip()
            if trimmed:
                try:
                    parsed = json.loads(trimmed)
                    if isinstance(parsed, dict):
                        return parsed
                except Exception:
                    return {}
        return {}

    @staticmethod
    def _non_negative_int(value: Any) -> int:
        if value is None or isinstance(value, bool):
            return 0
        try:
            numeric = float(value)
            if np.isnan(numeric) or numeric < 0:
                return 0
            return int(round(numeric))
        except (TypeError, ValueError):
            return 0

    def _aggregate_activities(self, df: pd.DataFrame) -> pd.DataFrame:
        cols = [
            "student_id",
            "course_id",
            "total_learning_events_count",
            "active_learning_days_count",
            "lesson_views_count",
            "video_watch_seconds",
            "text_reading_seconds",
            "quiz_duration_seconds",
            "total_study_time_seconds",
            "resource_downloads_count",
            "quiz_starts_count",
            "first_learning_activity_at",
            "last_learning_activity_at",
        ]
        if df.empty:
            return pd.DataFrame(columns=cols)

        work = df.copy()
        parsed_meta = [self._parse_metadata(v) for v in work.get("metadata", [None] * len(work))]
        activity_types = work["activity_type"].astype(str).str.upper().tolist()

        is_lesson_view: List[int] = []
        is_resource_download: List[int] = []
        is_quiz_start: List[int] = []
        video_seconds: List[int] = []
        text_seconds: List[int] = []
        quiz_seconds: List[int] = []

        for act_type, meta in zip(activity_types, parsed_meta):
            # Text lesson reading dwell-time flushes emit LESSON_VIEWED with reading_time_seconds;
            # exclude them from lesson_views_count so opening a lesson is not double-counted.
            if act_type == "LESSON_VIEWED" and "reading_time_seconds" not in meta:
                is_lesson_view.append(1)
            else:
                is_lesson_view.append(0)

            is_resource_download.append(1 if act_type == "RESOURCE_DOWNLOADED" else 0)
            is_quiz_start.append(1 if act_type == "QUIZ_STARTED" else 0)

            if act_type == "VIDEO_WATCHED":
                raw_vid = meta.get("duration_seconds")
                if raw_vid is None:
                    raw_vid = meta.get("watch_duration_seconds")
                video_seconds.append(self._non_negative_int(raw_vid))
            else:
                video_seconds.append(0)

            if act_type in ("LESSON_VIEWED", "LESSON_COMPLETED"):
                text_seconds.append(self._non_negative_int(meta.get("reading_time_seconds")))
            else:
                text_seconds.append(0)

            if act_type == "QUIZ_SUBMITTED":
                raw_quiz = meta.get("durationSeconds")
                if raw_quiz is None:
                    raw_quiz = meta.get("duration_seconds")
                if raw_quiz is None:
                    raw_quiz = meta.get("time_spent_seconds")
                quiz_seconds.append(self._non_negative_int(raw_quiz))
            else:
                quiz_seconds.append(0)

        work["_occurred_utc"] = self._parse_utc_series(work["occurred_at"])
        work["_activity_date"] = work["_occurred_utc"].dt.strftime("%Y-%m-%d")
        work["_is_lesson_view"] = is_lesson_view
        work["_is_resource_download"] = is_resource_download
        work["_is_quiz_start"] = is_quiz_start
        work["_video_watch_seconds"] = video_seconds
        work["_text_reading_seconds"] = text_seconds
        work["_quiz_duration_seconds"] = quiz_seconds

        grouped = work.groupby(["student_id", "course_id"]).agg(
            total_learning_events_count=("activity_type", "count"),
            active_learning_days_count=("_activity_date", "nunique"),
            lesson_views_count=("_is_lesson_view", "sum"),
            video_watch_seconds=("_video_watch_seconds", "sum"),
            text_reading_seconds=("_text_reading_seconds", "sum"),
            quiz_duration_seconds=("_quiz_duration_seconds", "sum"),
            resource_downloads_count=("_is_resource_download", "sum"),
            quiz_starts_count=("_is_quiz_start", "sum"),
            first_learning_activity_at=("_occurred_utc", "min"),
            last_learning_activity_at=("_occurred_utc", "max"),
        ).reset_index()

        grouped["total_study_time_seconds"] = (
            grouped["video_watch_seconds"]
            + grouped["text_reading_seconds"]
            + grouped["quiz_duration_seconds"]
        )
        return grouped

    def _calculate_recency_and_engagement(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate composite engagement score, days inactive, and academic status."""
        # Find earliest and latest activity across domain tables and standardized event telemetry
        timestamp_cols = [
            "enrolled_at", "first_lesson_completed_at", "last_lesson_completed_at",
            "last_quiz_submitted_at", "last_assignment_submitted_at", "certificate_issued_at",
            "first_learning_activity_at", "last_learning_activity_at",
        ]

        # Ensure timestamps are parsed consistently
        parsed_dates = []
        for col in timestamp_cols:
            if col in df.columns:
                parsed_dates.append(self._parse_utc_series(df[col]))

        if parsed_dates:
            dt_combined = pd.concat(parsed_dates, axis=1)
            df["first_activity_at"] = dt_combined.min(axis=1)
            df["last_activity_at"] = dt_combined.max(axis=1)
        else:
            df["first_activity_at"] = self._parse_utc_series(df["enrolled_at"])
            df["last_activity_at"] = df["first_activity_at"]

        now_utc = pd.to_datetime(self.now, utc=True)
        time_diff = (now_utc - df["last_activity_at"]).dt.total_seconds()
        df["days_since_last_activity"] = np.maximum(0, (time_diff / 86400.0).fillna(0).astype(int))

        # Course completion check: 100% lessons or certificate issued
        is_completed = (df["lesson_completion_rate_pct"] >= 100.0) | (df["has_certificate"] == True)
        df["is_course_completed"] = is_completed

        # Inactive flag: > 14 days without activity and not yet completed
        df["is_inactive"] = (df["days_since_last_activity"] > 14) & (~is_completed)

        # Composite Engagement & Performance Index (0 - 100)
        # Weights:
        # Progress: 40%
        # Quiz: 25% (quiz accuracy or quiz score)
        # Assignment: 20% (avg score pct or coverage)
        # Engagement/Social: 15% (discussions, notes, interactions capped at 100%)
        progress_part = df["lesson_completion_rate_pct"] * 0.40
        quiz_part = df["avg_quiz_score"] * 0.25
        assignment_part = df["avg_assignment_score_pct"] * 0.20
        
        # Interaction score: up to 10 points per interaction/note, max 100 points
        interaction_raw = (df["total_interactions_count"] * 15 + df["learning_notes_count"] * 10).clip(upper=100)
        interaction_part = interaction_raw * 0.15

        df["academic_engagement_score"] = np.round(progress_part + quiz_part + assignment_part + interaction_part, 2)
        df["academic_engagement_score"] = df["academic_engagement_score"].clip(lower=0.0, upper=100.0)

        # Categorize Academic Status:
        # COMPLETED, EXCELLING, ON_TRACK, AT_RISK, JUST_STARTED
        enrolled_days = ((now_utc - pd.to_datetime(df["enrolled_at"], utc=True)).dt.total_seconds() / 86400.0).fillna(0)
        conditions = [
            df["is_course_completed"] == True,
            (df["is_inactive"] == True) | ((enrolled_days > 14) & (df["academic_engagement_score"] < 35)),
            (df["academic_engagement_score"] >= 75),
            (enrolled_days <= 7) & (df["academic_engagement_score"] < 25),
        ]
        choices = ["COMPLETED", "AT_RISK", "EXCELLING", "JUST_STARTED"]
        df["academic_status"] = np.select(conditions, choices, default="ON_TRACK")

        return df

    @staticmethod
    def merge_incremental(
        historical_df: pd.DataFrame,
        incremental_df: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Merge incrementally updated student-course rows into the master historical dataset.
        Replaces existing records with identical (student_id, course_id) and appends new ones.
        """
        if historical_df.empty:
            return incremental_df.copy()
        if incremental_df.empty:
            return historical_df.copy()

        hist = historical_df.copy()
        inc = incremental_df.copy()

        hist["student_id"] = hist["student_id"].astype(str)
        hist["course_id"] = hist["course_id"].astype(str)
        inc["student_id"] = inc["student_id"].astype(str)
        inc["course_id"] = inc["course_id"].astype(str)

        # Identify key pairs
        inc_keys = set(zip(inc["student_id"], inc["course_id"]))
        hist_keys = list(zip(hist["student_id"], hist["course_id"]))

        # Filter out records from historical dataset that were recalculated in incremental run
        keep_mask = [k not in inc_keys for k in hist_keys]
        filtered_hist = hist[keep_mask]

        # Concatenate and sort
        combined = pd.concat([filtered_hist, inc], ignore_index=True)
        if "course_title" in combined.columns and "student_name" in combined.columns:
            combined = combined.sort_values(by=["course_title", "student_name"]).reset_index(drop=True)
        return combined
