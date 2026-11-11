"""
Pipeline Orchestrator for Academic Data Extraction & Analytics.
Coordinates the extraction, aggregation, export, and checkpoint updating workflows.
Handles both full backfill and incremental synchronizations.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd

from .aggregators import AcademicAggregator
from .config import PipelineConfig
from .db import DatabaseClient
from .exporters import AcademicDataExporter
from .extractors import AcademicDataExtractor
from .state import StateManager

logger = logging.getLogger("academic_pipeline.pipeline")


class AcademicPipeline:
    """End-to-end pipeline for extracting, aggregating, and exporting academic learning telemetry."""

    def __init__(
        self,
        config: Optional[PipelineConfig] = None,
        db_client: Optional[DatabaseClient] = None,
        reference_time: Optional[datetime] = None,
    ):
        self.config = config or PipelineConfig()
        self.db = db_client or DatabaseClient(self.config.db)
        self.reference_time: Optional[datetime] = (
            (reference_time.replace(tzinfo=timezone.utc) if reference_time.tzinfo is None else reference_time.astimezone(timezone.utc))
            if reference_time is not None
            else None
        )
        self.state_mgr = StateManager(self.config.state_file)
        self.extractor = AcademicDataExtractor(self.db)
        self.aggregator = AcademicAggregator(reference_time=self.reference_time)
        self.exporter = AcademicDataExporter(self.config.output_dir)

    def run(
        self,
        mode: str = "incremental",
        since_override: Optional[datetime] = None,
        dry_run: bool = False,
        formats: Optional[List[str]] = None,
        export_entities: bool = False,
    ) -> Dict[str, Any]:
        """
        Execute the academic extraction and aggregation pipeline.

        Args:
            mode: 'incremental' (default) or 'full'
            since_override: Manually specified UTC watermark timestamp
            dry_run: If True, executes queries without updating state or writing files
            formats: List of export formats e.g. ['csv', 'json', 'parquet']
            export_entities: Also export individual entity files
        """
        start_time = time.perf_counter()
        execution_watermark = self.reference_time or datetime.now(timezone.utc)
        normalized_mode = mode.lower().strip()

        logger.info(
            "Starting Academic Pipeline [Mode: %s, Dry-run: %s, Database: %s]",
            normalized_mode.upper(), dry_run, self.config.db.database
        )

        try:
            if normalized_mode == "full":
                result = self._run_full(execution_watermark, dry_run, formats, export_entities)
            elif normalized_mode == "incremental":
                watermark = since_override or self.state_mgr.get_watermark()
                if watermark is None:
                    logger.info("No prior watermark found; transitioning to FULL extraction mode.")
                    result = self._run_full(execution_watermark, dry_run, formats, export_entities)
                else:
                    result = self._run_incremental(watermark, execution_watermark, dry_run, formats, export_entities)
            else:
                raise ValueError(f"Unsupported pipeline mode: {mode}. Must be 'incremental' or 'full'.")

            duration = time.perf_counter() - start_time
            result["duration_seconds"] = round(duration, 2)
            logger.info(
                "Academic Pipeline completed successfully in %.2fs. Aggregated %d pairs.",
                duration, result.get("pairs_count", 0)
            )
            return result

        except Exception as exc:
            duration = time.perf_counter() - start_time
            logger.error("Academic Pipeline run failed after %.2fs: %s", duration, exc, exc_info=True)
            if not dry_run:
                self.state_mgr.record_failed_run(normalized_mode, duration, str(exc))
            raise

    def _run_full(
        self,
        execution_watermark: datetime,
        dry_run: bool,
        formats: Optional[List[str]],
        export_entities: bool,
    ) -> Dict[str, Any]:
        """Execute full historical extraction across all students and courses."""
        logger.info("Executing FULL academic extraction...")

        curriculum_df = self.extractor.extract_course_curriculum_catalog()
        enrollments_df = self.extractor.extract_enrollments()
        progress_df = self.extractor.extract_lesson_progress()
        quiz_df = self.extractor.extract_quiz_attempts()
        assignment_df = self.extractor.extract_assignments()
        discussions_df = self.extractor.extract_discussions()
        comments_df = self.extractor.extract_discussion_comments()
        certificates_df = self.extractor.extract_certificates()
        reviews_df = self.extractor.extract_reviews()
        notes_df = self.extractor.extract_learning_notes()
        activities_df = self.extractor.extract_learning_activities()

        tables_extracted = {
            "courses": len(curriculum_df),
            "enrollments": len(enrollments_df),
            "lesson_progress": len(progress_df),
            "quiz_attempts": len(quiz_df),
            "assignments": len(assignment_df),
            "discussions": len(discussions_df),
            "discussion_comments": len(comments_df),
            "certificates": len(certificates_df),
            "reviews": len(reviews_df),
            "learning_notes": len(notes_df),
            "learning_activities": len(activities_df),
        }

        # Aggregate metrics
        summary_df = self.aggregator.aggregate(
            enrollments_df=enrollments_df,
            curriculum_df=curriculum_df,
            progress_df=progress_df,
            quiz_df=quiz_df,
            assignment_df=assignment_df,
            discussions_df=discussions_df,
            comments_df=comments_df,
            certificates_df=certificates_df,
            reviews_df=reviews_df,
            notes_df=notes_df,
            activities_df=activities_df,
        )

        exported_files: Dict[str, Path] = {}
        if not dry_run:
            exported_files = self.exporter.export_all(summary_df, formats=formats)

            if export_entities:
                self._export_raw_entities({
                    "raw_enrollments": enrollments_df,
                    "raw_progress": progress_df,
                    "raw_quizzes": quiz_df,
                    "raw_assignments": assignment_df,
                    "raw_discussions": discussions_df,
                    "raw_comments": comments_df,
                    "raw_certificates": certificates_df,
                    "raw_reviews": reviews_df,
                    "raw_notes": notes_df,
                    "raw_activities": activities_df,
                })

            if self.config.enable_db_metrics_table:
                self.exporter.upsert_to_database(summary_df, self.db.engine, self.config.metrics_table_name)

            self.state_mgr.record_successful_run(
                new_watermark=execution_watermark,
                mode="FULL",
                duration_seconds=0.0,
                pairs_aggregated=len(summary_df),
                tables_extracted=tables_extracted,
            )

        return {
            "mode": "FULL",
            "status": "SUCCESS",
            "pairs_count": len(summary_df),
            "exported_files": {k: str(v) for k, v in exported_files.items()},
            "tables_extracted": tables_extracted,
            "watermark": execution_watermark.isoformat(),
            "summary_df": summary_df,
        }

    def _run_incremental(
        self,
        watermark: datetime,
        execution_watermark: datetime,
        dry_run: bool,
        formats: Optional[List[str]],
        export_entities: bool,
    ) -> Dict[str, Any]:
        """Execute incremental extraction for records modified since watermark."""
        logger.info("Executing INCREMENTAL academic extraction since %s...", watermark.isoformat())

        changed_pairs = self.extractor.find_changed_pairs_since(watermark)
        if not changed_pairs:
            logger.info("No learning activities modified since watermark. Dataset is up to date.")
            if not dry_run:
                self.state_mgr.record_successful_run(
                    new_watermark=execution_watermark,
                    mode="INCREMENTAL",
                    duration_seconds=0.0,
                    pairs_aggregated=0,
                    tables_extracted={},
                )
            return {
                "mode": "INCREMENTAL",
                "status": "UP_TO_DATE",
                "pairs_count": 0,
                "changed_pairs_count": 0,
                "exported_files": {},
                "watermark": execution_watermark.isoformat(),
            }

        # Extract only records belonging to changed student-course pairs
        curriculum_df = self.extractor.extract_course_curriculum_catalog()
        enrollments_df = self.extractor.extract_enrollments(target_pairs=changed_pairs)
        progress_df = self.extractor.extract_lesson_progress(target_pairs=changed_pairs)
        quiz_df = self.extractor.extract_quiz_attempts(target_pairs=changed_pairs)
        assignment_df = self.extractor.extract_assignments(target_pairs=changed_pairs)
        discussions_df = self.extractor.extract_discussions(target_pairs=changed_pairs)
        comments_df = self.extractor.extract_discussion_comments(target_pairs=changed_pairs)
        certificates_df = self.extractor.extract_certificates(target_pairs=changed_pairs)
        reviews_df = self.extractor.extract_reviews(target_pairs=changed_pairs)
        notes_df = self.extractor.extract_learning_notes(target_pairs=changed_pairs)
        activities_df = self.extractor.extract_learning_activities(target_pairs=changed_pairs)

        tables_extracted = {
            "changed_pairs": len(changed_pairs),
            "enrollments": len(enrollments_df),
            "lesson_progress": len(progress_df),
            "quiz_attempts": len(quiz_df),
            "assignments": len(assignment_df),
            "discussions": len(discussions_df),
            "discussion_comments": len(comments_df),
            "certificates": len(certificates_df),
            "reviews": len(reviews_df),
            "learning_notes": len(notes_df),
            "learning_activities": len(activities_df),
        }

        # Aggregate incremental updates
        incremental_df = self.aggregator.aggregate(
            enrollments_df=enrollments_df,
            curriculum_df=curriculum_df,
            progress_df=progress_df,
            quiz_df=quiz_df,
            assignment_df=assignment_df,
            discussions_df=discussions_df,
            comments_df=comments_df,
            certificates_df=certificates_df,
            reviews_df=reviews_df,
            notes_df=notes_df,
            activities_df=activities_df,
        )

        # Merge with existing master dataset on disk
        master_csv_path = self.config.output_dir / "student_course_academic_summary.csv"
        if master_csv_path.exists():
            try:
                historical_df = pd.read_csv(master_csv_path)
            except Exception as exc:
                logger.warning("Failed to load historical CSV (%s); using incremental only: %s", master_csv_path, exc)
                historical_df = pd.DataFrame()
        else:
            historical_df = pd.DataFrame()

        final_summary_df = AcademicAggregator.merge_incremental(historical_df, incremental_df)

        exported_files: Dict[str, Path] = {}
        if not dry_run:
            exported_files = self.exporter.export_all(final_summary_df, formats=formats)

            if export_entities:
                self._export_raw_entities({
                    "raw_incremental_enrollments": enrollments_df,
                    "raw_incremental_progress": progress_df,
                    "raw_incremental_quizzes": quiz_df,
                    "raw_incremental_assignments": assignment_df,
                    "raw_incremental_discussions": discussions_df,
                    "raw_incremental_comments": comments_df,
                    "raw_incremental_certificates": certificates_df,
                    "raw_incremental_reviews": reviews_df,
                    "raw_incremental_notes": notes_df,
                    "raw_incremental_activities": activities_df,
                })

            if self.config.enable_db_metrics_table:
                # Upsert the updated pairs to database
                self.exporter.upsert_to_database(incremental_df, self.db.engine, self.config.metrics_table_name)

            self.state_mgr.record_successful_run(
                new_watermark=execution_watermark,
                mode="INCREMENTAL",
                duration_seconds=0.0,
                pairs_aggregated=len(incremental_df),
                tables_extracted=tables_extracted,
            )

        return {
            "mode": "INCREMENTAL",
            "status": "SUCCESS",
            "pairs_count": len(final_summary_df),
            "changed_pairs_count": len(changed_pairs),
            "exported_files": {k: str(v) for k, v in exported_files.items()},
            "tables_extracted": tables_extracted,
            "watermark": execution_watermark.isoformat(),
            "summary_df": final_summary_df,
        }

    def _export_raw_entities(self, entity_dfs: Dict[str, pd.DataFrame]) -> None:
        """Export raw entity snapshots to subfolder."""
        raw_dir = self.config.output_dir / "entities"
        raw_dir.mkdir(parents=True, exist_ok=True)
        for name, df in entity_dfs.items():
            if not df.empty:
                df.to_csv(raw_dir / f"{name}.csv", index=False)
