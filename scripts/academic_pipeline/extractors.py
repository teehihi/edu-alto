"""
Domain-specific SQL extractors for EduAlto PostgreSQL database.
Extracts student profiles, courses, enrollments, lesson progress,
quizzes, assignments, discussions, certificates, and reviews.
Supports both full snapshot extraction and incremental watermark filtering.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd
from sqlalchemy import inspect

from .db import DatabaseClient

logger = logging.getLogger("academic_pipeline.extractors")


class AcademicDataExtractor:
    """Extracts raw academic entities from PostgreSQL with optional watermark filtering."""

    def __init__(self, db_client: DatabaseClient):
        self.db = db_client

    def find_changed_pairs_since(self, watermark: datetime) -> Set[Tuple[str, str]]:
        """
        Identify distinct (student_id, course_id) pairs modified across
        any academic tables since the given watermark timestamp.
        """
        logger.info("Detecting modified student-course pairs since %s", watermark.isoformat())
        changed_pairs: Set[Tuple[str, str]] = set()
        iso_wm = watermark.isoformat()
        # Ensure SQLite compares strings consistently while PostgreSQL uses timestamp objects
        if self.db.engine.dialect.name == "sqlite":
            wm_param = watermark.strftime("%Y-%m-%dT%H:%M:%SZ") if isinstance(watermark, datetime) else str(watermark)
        else:
            wm_param = watermark
        params = {"wm": wm_param}

        # 1. Enrollments modified
        q_enroll = """
            SELECT DISTINCT student_id, course_id 
            FROM enrollments 
            WHERE updated_at > :wm OR enrolled_at > :wm
        """
        df = self.db.query_to_dataframe(q_enroll, params)
        for _, row in df.iterrows():
            changed_pairs.add((str(row["student_id"]), str(row["course_id"])))

        # 2. Learning progress modified
        q_prog = """
            SELECT DISTINCT e.student_id, lp.course_id
            FROM learning_progress lp
            JOIN enrollments e ON lp.enrollment_id = e.id
            WHERE lp.updated_at > :wm OR lp.completed_at > :wm
        """
        df = self.db.query_to_dataframe(q_prog, params)
        for _, row in df.iterrows():
            changed_pairs.add((str(row["student_id"]), str(row["course_id"])))

        # 3. Quiz attempts modified (quizzes -> lessons -> sections -> courses)
        q_quiz = """
            SELECT DISTINCT qa.student_id, s.course_id
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            JOIN lessons l ON q.lesson_id = l.id
            JOIN sections s ON l.section_id = s.id
            WHERE qa.submitted_at > :wm
        """
        df = self.db.query_to_dataframe(q_quiz, params)
        for _, row in df.iterrows():
            changed_pairs.add((str(row["student_id"]), str(row["course_id"])))

        # 4. Assignment submissions modified
        q_assign = """
            SELECT DISTINCT asub.student_id, a.course_id
            FROM assignment_submissions asub
            JOIN assignments a ON asub.assignment_id = a.id
            WHERE asub.updated_at > :wm OR asub.submitted_at > :wm
        """
        df = self.db.query_to_dataframe(q_assign, params)
        for _, row in df.iterrows():
            changed_pairs.add((str(row["student_id"]), str(row["course_id"])))

        # 5. Discussions modified
        q_disc = """
            SELECT DISTINCT d.author_id AS student_id, d.course_id
            FROM discussions d
            WHERE d.updated_at > :wm OR d.created_at > :wm
        """
        df = self.db.query_to_dataframe(q_disc, params)
        for _, row in df.iterrows():
            changed_pairs.add((str(row["student_id"]), str(row["course_id"])))

        # 6. Discussion comments modified
        q_comm = """
            SELECT DISTINCT dc.author_id AS student_id, d.course_id
            FROM discussion_comments dc
            JOIN discussions d ON dc.discussion_id = d.id
            WHERE dc.updated_at > :wm OR dc.created_at > :wm
        """
        df = self.db.query_to_dataframe(q_comm, params)
        for _, row in df.iterrows():
            changed_pairs.add((str(row["student_id"]), str(row["course_id"])))

        # 7. Certificates issued
        q_cert = """
            SELECT DISTINCT student_id, course_id
            FROM certificates
            WHERE created_at > :wm OR issued_at > :wm
        """
        df = self.db.query_to_dataframe(q_cert, params)
        for _, row in df.iterrows():
            changed_pairs.add((str(row["student_id"]), str(row["course_id"])))

        # 8. Course reviews
        q_rev = """
            SELECT DISTINCT student_id, course_id
            FROM course_reviews
            WHERE updated_at > :wm OR created_at > :wm
        """
        df = self.db.query_to_dataframe(q_rev, params)
        for _, row in df.iterrows():
            changed_pairs.add((str(row["student_id"]), str(row["course_id"])))

        # 9. Learning notes
        q_notes = """
            SELECT DISTINCT ln.user_id AS student_id, s.course_id
            FROM learning_notes ln
            JOIN lessons l ON ln.lesson_id = l.id
            JOIN sections s ON l.section_id = s.id
            WHERE ln.updated_at > :wm OR ln.created_at > :wm
        """
        df = self.db.query_to_dataframe(q_notes, params)
        for _, row in df.iterrows():
            changed_pairs.add((str(row["student_id"]), str(row["course_id"])))

        # 10. Learning activities telemetry (V34 table when present)
        if inspect(self.db.engine).has_table("learning_activities"):
            q_act = """
                SELECT DISTINCT student_id, course_id
                FROM learning_activities
                WHERE updated_at > :wm OR occurred_at > :wm
            """
            df = self.db.query_to_dataframe(q_act, params)
            for _, row in df.iterrows():
                changed_pairs.add((str(row["student_id"]), str(row["course_id"])))

        logger.info("Identified %d unique student-course pairs with changes.", len(changed_pairs))
        return changed_pairs

    def extract_course_curriculum_catalog(self) -> pd.DataFrame:
        """
        Extract course-level curriculum baselines:
        Total lessons, duration, total quizzes, and total assignments per course.
        """
        query = """
            SELECT 
                c.id AS course_id,
                c.title AS course_title,
                c.slug AS course_slug,
                c.level AS course_level,
                c.status AS course_status,
                COALESCE(les.total_lessons, 0) AS total_lessons,
                COALESCE(les.total_duration_seconds, 0) AS total_duration_seconds,
                COALESCE(qz.total_quizzes, 0) AS total_quizzes,
                COALESCE(asn.total_assignments, 0) AS total_assignments
            FROM courses c
            LEFT JOIN (
                SELECT s.course_id, 
                       COUNT(l.id) AS total_lessons, 
                       SUM(COALESCE(l.duration_seconds, 0)) AS total_duration_seconds
                FROM sections s
                JOIN lessons l ON l.section_id = s.id
                WHERE l.status = 'PUBLISHED'
                GROUP BY s.course_id
            ) les ON les.course_id = c.id
            LEFT JOIN (
                SELECT s.course_id, COUNT(q.id) AS total_quizzes
                FROM quizzes q
                JOIN lessons l ON q.lesson_id = l.id
                JOIN sections s ON l.section_id = s.id
                WHERE l.status = 'PUBLISHED'
                GROUP BY s.course_id
            ) qz ON qz.course_id = c.id
            LEFT JOIN (
                SELECT a.course_id, COUNT(a.id) AS total_assignments
                FROM assignments a
                WHERE a.status = 'PUBLISHED'
                GROUP BY a.course_id
            ) asn ON asn.course_id = c.id
        """
        return self.db.query_to_dataframe(query)

    def extract_enrollments(self, target_pairs: Optional[Set[Tuple[str, str]]] = None) -> pd.DataFrame:
        """Extract enrollment base records with user and course info."""
        query = """
            SELECT 
                e.id AS enrollment_id,
                e.student_id,
                u.full_name AS student_name,
                u.email AS student_email,
                e.course_id,
                c.title AS course_title,
                c.slug AS course_slug,
                c.level AS course_level,
                e.status AS enrollment_status,
                e.enrolled_at,
                e.created_at,
                e.updated_at
            FROM enrollments e
            JOIN users u ON e.student_id = u.id
            JOIN courses c ON e.course_id = c.id
        """
        df = self.db.query_to_dataframe(query)
        if target_pairs is not None:
            # Filter to target pairs
            df["_pair"] = list(zip(df["student_id"].astype(str), df["course_id"].astype(str)))
            df = df[df["_pair"].isin(target_pairs)].drop(columns=["_pair"])
        return df

    def extract_lesson_progress(self, target_pairs: Optional[Set[Tuple[str, str]]] = None) -> pd.DataFrame:
        """Extract lesson completion progress per student and course."""
        query = """
            SELECT 
                e.student_id,
                lp.course_id,
                lp.lesson_id,
                lp.completed_at,
                COALESCE(l.duration_seconds, 0) AS duration_seconds
            FROM learning_progress lp
            JOIN enrollments e ON lp.enrollment_id = e.id
            JOIN lessons l ON lp.lesson_id = l.id
        """
        df = self.db.query_to_dataframe(query)
        if target_pairs is not None:
            df["_pair"] = list(zip(df["student_id"].astype(str), df["course_id"].astype(str)))
            df = df[df["_pair"].isin(target_pairs)].drop(columns=["_pair"])
        return df

    def extract_quiz_attempts(self, target_pairs: Optional[Set[Tuple[str, str]]] = None) -> pd.DataFrame:
        """Extract quiz attempts, scores, and correct answers per student and course."""
        query = """
            SELECT 
                qa.id AS attempt_id,
                qa.student_id,
                s.course_id,
                qa.quiz_id,
                qa.score,
                qa.correct_answers,
                qa.total_questions,
                qa.passed,
                qa.submitted_at
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            JOIN lessons l ON q.lesson_id = l.id
            JOIN sections s ON l.section_id = s.id
        """
        df = self.db.query_to_dataframe(query)
        if target_pairs is not None:
            df["_pair"] = list(zip(df["student_id"].astype(str), df["course_id"].astype(str)))
            df = df[df["_pair"].isin(target_pairs)].drop(columns=["_pair"])
        return df

    def extract_assignments(self, target_pairs: Optional[Set[Tuple[str, str]]] = None) -> pd.DataFrame:
        """Extract assignment submissions, scores, and submission timeliness."""
        query = """
            SELECT 
                asub.id AS submission_id,
                asub.student_id,
                a.course_id,
                asub.assignment_id,
                asub.submitted_at,
                asub.score,
                a.max_score,
                a.due_at,
                CASE 
                    WHEN a.due_at IS NULL THEN TRUE
                    WHEN asub.submitted_at <= a.due_at THEN TRUE
                    ELSE FALSE
                END AS is_on_time
            FROM assignment_submissions asub
            JOIN assignments a ON asub.assignment_id = a.id
        """
        df = self.db.query_to_dataframe(query)
        if target_pairs is not None:
            df["_pair"] = list(zip(df["student_id"].astype(str), df["course_id"].astype(str)))
            df = df[df["_pair"].isin(target_pairs)].drop(columns=["_pair"])
        return df

    def extract_discussions(self, target_pairs: Optional[Set[Tuple[str, str]]] = None) -> pd.DataFrame:
        """Extract questions and discussions initiated by students."""
        query = """
            SELECT 
                d.id AS discussion_id,
                d.author_id AS student_id,
                d.course_id,
                d.video_timestamp_seconds,
                d.created_at
            FROM discussions d
            WHERE d.deleted_at IS NULL
        """
        df = self.db.query_to_dataframe(query)
        if target_pairs is not None:
            df["_pair"] = list(zip(df["student_id"].astype(str), df["course_id"].astype(str)))
            df = df[df["_pair"].isin(target_pairs)].drop(columns=["_pair"])
        return df

    def extract_discussion_comments(self, target_pairs: Optional[Set[Tuple[str, str]]] = None) -> pd.DataFrame:
        """Extract discussion responses and comments made by students."""
        query = """
            SELECT 
                dc.id AS comment_id,
                dc.author_id AS student_id,
                d.course_id,
                dc.created_at
            FROM discussion_comments dc
            JOIN discussions d ON dc.discussion_id = d.id
            WHERE dc.deleted_at IS NULL
        """
        df = self.db.query_to_dataframe(query)
        if target_pairs is not None:
            df["_pair"] = list(zip(df["student_id"].astype(str), df["course_id"].astype(str)))
            df = df[df["_pair"].isin(target_pairs)].drop(columns=["_pair"])
        return df

    def extract_certificates(self, target_pairs: Optional[Set[Tuple[str, str]]] = None) -> pd.DataFrame:
        """Extract course completion certificates."""
        query = """
            SELECT 
                c.id AS certificate_id,
                c.student_id,
                c.course_id,
                c.certificate_number,
                c.issued_at
            FROM certificates c
        """
        df = self.db.query_to_dataframe(query)
        if target_pairs is not None:
            df["_pair"] = list(zip(df["student_id"].astype(str), df["course_id"].astype(str)))
            df = df[df["_pair"].isin(target_pairs)].drop(columns=["_pair"])
        return df

    def extract_reviews(self, target_pairs: Optional[Set[Tuple[str, str]]] = None) -> pd.DataFrame:
        """Extract student course reviews and ratings."""
        query = """
            SELECT 
                cr.id AS review_id,
                cr.student_id,
                cr.course_id,
                cr.rating,
                cr.created_at
            FROM course_reviews cr
            WHERE cr.status = 'PUBLISHED'
        """
        df = self.db.query_to_dataframe(query)
        if target_pairs is not None:
            df["_pair"] = list(zip(df["student_id"].astype(str), df["course_id"].astype(str)))
            df = df[df["_pair"].isin(target_pairs)].drop(columns=["_pair"])
        return df

    def extract_learning_notes(self, target_pairs: Optional[Set[Tuple[str, str]]] = None) -> pd.DataFrame:
        """Extract student personal learning notes."""
        query = """
            SELECT 
                ln.id AS note_id,
                ln.user_id AS student_id,
                s.course_id,
                ln.created_at
            FROM learning_notes ln
            JOIN lessons l ON ln.lesson_id = l.id
            JOIN sections s ON l.section_id = s.id
        """
        df = self.db.query_to_dataframe(query)
        if target_pairs is not None:
            df["_pair"] = list(zip(df["student_id"].astype(str), df["course_id"].astype(str)))
            df = df[df["_pair"].isin(target_pairs)].drop(columns=["_pair"])
        return df

    def extract_learning_activities(self, target_pairs: Optional[Set[Tuple[str, str]]] = None) -> pd.DataFrame:
        """Extract standardized learning activity telemetry rows (V34) when available."""
        if not inspect(self.db.engine).has_table("learning_activities"):
            return pd.DataFrame(columns=[
                "activity_id",
                "student_id",
                "course_id",
                "section_id",
                "lesson_id",
                "activity_type",
                "source_id",
                "occurred_at",
                "metadata",
            ])

        query = """
            SELECT
                la.id AS activity_id,
                la.student_id,
                la.course_id,
                la.section_id,
                la.lesson_id,
                la.activity_type,
                la.source_id,
                la.occurred_at,
                la.metadata
            FROM learning_activities la
        """
        df = self.db.query_to_dataframe(query)
        if target_pairs is not None and not df.empty:
            df["_pair"] = list(zip(df["student_id"].astype(str), df["course_id"].astype(str)))
            df = df[df["_pair"].isin(target_pairs)].drop(columns=["_pair"])
        return df
