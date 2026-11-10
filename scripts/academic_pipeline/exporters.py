"""
Multi-format analytical data exporter.
Exports student-course academic metrics to CSV, JSON, Parquet, and PostgreSQL target tables.
Supports atomic file replacement and database upsert operations.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger("academic_pipeline.exporters")


class AcademicDataExporter:
    """Exports aggregated academic metrics to analytical files and/or relational database."""

    def __init__(self, output_dir: Path):
        self.output_dir = Path(output_dir).resolve()
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export_all(
        self,
        df: pd.DataFrame,
        base_filename: str = "student_course_academic_summary",
        formats: Optional[List[str]] = None,
    ) -> Dict[str, Path]:
        """
        Export DataFrame to specified formats (csv, json, jsonl, parquet).
        Returns mapping of format -> output file path.
        """
        if df.empty:
            logger.warning("Empty DataFrame provided to exporter; writing empty structures.")

        selected_formats = [f.lower().strip() for f in (formats or ["csv", "json", "parquet"])]
        if "all" in selected_formats:
            selected_formats = ["csv", "json", "jsonl", "parquet"]

        exported_paths: Dict[str, Path] = {}

        # 1. CSV Export
        if "csv" in selected_formats:
            csv_path = self.output_dir / f"{base_filename}.csv"
            self.export_csv(df, csv_path)
            exported_paths["csv"] = csv_path

        # 2. JSON Export
        if "json" in selected_formats:
            json_path = self.output_dir / f"{base_filename}.json"
            self.export_json(df, json_path)
            exported_paths["json"] = json_path

        # 3. JSONL Export
        if "jsonl" in selected_formats:
            jsonl_path = self.output_dir / f"{base_filename}.jsonl"
            self.export_jsonl(df, jsonl_path)
            exported_paths["jsonl"] = jsonl_path

        # 4. Parquet Export
        if "parquet" in selected_formats:
            parquet_path = self.output_dir / f"{base_filename}.parquet"
            try:
                self.export_parquet(df, parquet_path)
                exported_paths["parquet"] = parquet_path
            except Exception as exc:
                logger.warning("Could not export Parquet (pyarrow/fastparquet issue): %s", exc)

        return exported_paths

    def export_csv(self, df: pd.DataFrame, target_path: Path) -> Path:
        """Write DataFrame to CSV atomically."""
        temp_dir = target_path.parent
        with tempfile.NamedTemporaryFile("w", dir=temp_dir, delete=False, suffix=".csv", encoding="utf-8-sig") as tf:
            df.to_csv(tf.name, index=False, encoding="utf-8-sig")
            temp_name = tf.name

        os.replace(temp_name, target_path)
        logger.info("Exported CSV: %s (%d rows)", target_path, len(df))
        return target_path

    def export_json(self, df: pd.DataFrame, target_path: Path) -> Path:
        """Write DataFrame to JSON array atomically."""
        temp_dir = target_path.parent
        with tempfile.NamedTemporaryFile("w", dir=temp_dir, delete=False, suffix=".json", encoding="utf-8") as tf:
            df.to_json(tf.name, orient="records", date_format="iso", indent=2, force_ascii=False)
            temp_name = tf.name

        os.replace(temp_name, target_path)
        logger.info("Exported JSON: %s (%d rows)", target_path, len(df))
        return target_path

    def export_jsonl(self, df: pd.DataFrame, target_path: Path) -> Path:
        """Write DataFrame to newline-delimited JSON atomically."""
        temp_dir = target_path.parent
        with tempfile.NamedTemporaryFile("w", dir=temp_dir, delete=False, suffix=".jsonl", encoding="utf-8") as tf:
            df.to_json(tf.name, orient="records", lines=True, date_format="iso", force_ascii=False)
            temp_name = tf.name

        os.replace(temp_name, target_path)
        logger.info("Exported JSONL: %s (%d rows)", target_path, len(df))
        return target_path

    def export_parquet(self, df: pd.DataFrame, target_path: Path) -> Path:
        """Write DataFrame to Apache Parquet format atomically."""
        temp_dir = target_path.parent
        # Ensure timestamp columns are properly typed
        clean_df = df.copy()
        for col in clean_df.columns:
            if "at" in col or "date" in col or "timestamp" in col:
                try:
                    clean_df[col] = pd.to_datetime(clean_df[col], errors="coerce", utc=True)
                except Exception:
                    pass

        with tempfile.NamedTemporaryFile("wb", dir=temp_dir, delete=False, suffix=".parquet") as tf:
            clean_df.to_parquet(tf.name, index=False, engine="pyarrow")
            temp_name = tf.name

        os.replace(temp_name, target_path)
        logger.info("Exported Parquet: %s (%d rows)", target_path, len(clean_df))
        return target_path

    def upsert_to_database(self, df: pd.DataFrame, engine: Engine, table_name: str = "academic_student_course_metrics") -> int:
        """
        Optionally upsert calculated academic metrics into a PostgreSQL analytics table.
        Creates table if it does not exist and updates on (student_id, course_id) conflict.
        """
        if df.empty:
            return 0

        is_postgres = engine.dialect.name == "postgresql"

        # DDL
        if is_postgres:
            create_table_ddl = f"""
                CREATE TABLE IF NOT EXISTS {table_name} (
                    student_id UUID NOT NULL,
                    course_id UUID NOT NULL,
                    student_name VARCHAR(160) NOT NULL,
                    student_email VARCHAR(255) NOT NULL,
                    course_title VARCHAR(255) NOT NULL,
                    course_slug VARCHAR(255) NOT NULL,
                    course_level VARCHAR(40),
                    enrollment_status VARCHAR(40),
                    total_lessons INT DEFAULT 0,
                    completed_lessons_count INT DEFAULT 0,
                    lesson_completion_rate_pct NUMERIC(6, 2) DEFAULT 0.00,
                    quizzes_attempted_count INT DEFAULT 0,
                    quizzes_passed_count INT DEFAULT 0,
                    avg_quiz_score NUMERIC(6, 2) DEFAULT 0.00,
                    assignments_submitted_count INT DEFAULT 0,
                    avg_assignment_score_pct NUMERIC(6, 2) DEFAULT 0.00,
                    total_interactions_count INT DEFAULT 0,
                    learning_notes_count INT DEFAULT 0,
                    has_certificate BOOLEAN DEFAULT FALSE,
                    certificate_number VARCHAR(48),
                    academic_engagement_score NUMERIC(6, 2) DEFAULT 0.00,
                    academic_status VARCHAR(30) DEFAULT 'ON_TRACK',
                    days_since_last_activity INT DEFAULT 0,
                    is_inactive BOOLEAN DEFAULT FALSE,
                    last_activity_at TIMESTAMPTZ,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (student_id, course_id)
                );
            """
        else:
            # SQLite fallback for test suites
            create_table_ddl = f"""
                CREATE TABLE IF NOT EXISTS {table_name} (
                    student_id TEXT NOT NULL,
                    course_id TEXT NOT NULL,
                    student_name TEXT NOT NULL,
                    student_email TEXT NOT NULL,
                    course_title TEXT NOT NULL,
                    course_slug TEXT NOT NULL,
                    course_level TEXT,
                    enrollment_status TEXT,
                    total_lessons INTEGER DEFAULT 0,
                    completed_lessons_count INTEGER DEFAULT 0,
                    lesson_completion_rate_pct REAL DEFAULT 0.0,
                    quizzes_attempted_count INTEGER DEFAULT 0,
                    quizzes_passed_count INTEGER DEFAULT 0,
                    avg_quiz_score REAL DEFAULT 0.0,
                    assignments_submitted_count INTEGER DEFAULT 0,
                    avg_assignment_score_pct REAL DEFAULT 0.0,
                    total_interactions_count INTEGER DEFAULT 0,
                    learning_notes_count INTEGER DEFAULT 0,
                    has_certificate INTEGER DEFAULT 0,
                    certificate_number TEXT,
                    academic_engagement_score REAL DEFAULT 0.0,
                    academic_status TEXT DEFAULT 'ON_TRACK',
                    days_since_last_activity INTEGER DEFAULT 0,
                    is_inactive INTEGER DEFAULT 0,
                    last_activity_at TEXT,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (student_id, course_id)
                );
            """

        with engine.begin() as conn:
            conn.execute(text(create_table_ddl))

            # Selected columns to persist
            cols = [
                "student_id", "course_id", "student_name", "student_email", "course_title",
                "course_slug", "course_level", "enrollment_status", "total_lessons",
                "completed_lessons_count", "lesson_completion_rate_pct", "quizzes_attempted_count",
                "quizzes_passed_count", "avg_quiz_score", "assignments_submitted_count",
                "avg_assignment_score_pct", "total_interactions_count", "learning_notes_count",
                "has_certificate", "certificate_number", "academic_engagement_score",
                "academic_status", "days_since_last_activity", "is_inactive"
            ]
            
            # Prepare rows
            valid_cols = [c for c in cols if c in df.columns]
            subset = df[valid_cols].copy()

            for _, row in subset.iterrows():
                row_dict = row.to_dict()
                # Clean NaNs
                for k, v in row_dict.items():
                    if pd.isna(v):
                        row_dict[k] = None

                if is_postgres:
                    upsert_sql = f"""
                        INSERT INTO {table_name} ({', '.join(valid_cols)}, updated_at)
                        VALUES ({', '.join(':' + c for c in valid_cols)}, CURRENT_TIMESTAMP)
                        ON CONFLICT (student_id, course_id) DO UPDATE SET
                            {', '.join(f"{c} = EXCLUDED.{c}" for c in valid_cols if c not in ("student_id", "course_id"))},
                            updated_at = CURRENT_TIMESTAMP;
                    """
                else:
                    upsert_sql = f"""
                        INSERT OR REPLACE INTO {table_name} ({', '.join(valid_cols)}, updated_at)
                        VALUES ({', '.join(':' + c for c in valid_cols)}, datetime('now'));
                    """
                conn.execute(text(upsert_sql), row_dict)

        logger.info("Upserted %d student-course metrics into table '%s'", len(df), table_name)
        return len(df)
