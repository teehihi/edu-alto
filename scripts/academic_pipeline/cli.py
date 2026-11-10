"""
Command-Line Interface for the EduAlto Academic Data Pipeline.
Provides rich CLI commands for scheduled cron jobs, ad-hoc runs,
status inspections, and database connection verifications.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from .config import DatabaseConfig, PipelineConfig
from .db import DatabaseClient
from .pipeline import AcademicPipeline
from .state import StateManager


def setup_logging(verbose: bool = False) -> None:
    """Configure structured logging output with timestamps."""
    level = logging.DEBUG if verbose else logging.INFO
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers = [handler]


def parse_arguments(argv: Optional[List[str]] = None) -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        prog="academic-pipeline",
        description="EduAlto Academic Data Extraction & Aggregation Pipeline (PostgreSQL -> Learning Metrics)",
    )

    parser.add_argument(
        "--mode",
        choices=["incremental", "full"],
        default="incremental",
        help="Extraction execution mode: 'incremental' (default) or 'full' backfill",
    )
    parser.add_argument(
        "--since",
        type=str,
        default=None,
        help="Override extraction watermark with an ISO timestamp (e.g., 2026-11-01T00:00:00Z)",
    )
    parser.add_argument(
        "--format",
        nargs="+",
        default=["all"],
        choices=["csv", "json", "jsonl", "parquet", "all"],
        help="Export file formats to produce (default: all)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/academic_exports",
        help="Directory where aggregated datasets and state are stored (default: data/academic_exports)",
    )
    parser.add_argument(
        "--export-entities",
        action="store_true",
        help="Also export raw domain entities (enrollments, lessons, quizzes, etc.) to entities/ subfolder",
    )
    parser.add_argument(
        "--save-to-db",
        action="store_true",
        help="Upsert student-course metrics directly into PostgreSQL table 'academic_student_course_metrics'",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Execute extraction queries without writing files or advancing checkpoint state",
    )
    parser.add_argument(
        "--test-connection",
        action="store_true",
        help="Test connectivity to PostgreSQL and report latency and server version",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Display current watermark, execution history, and checkpoint status",
    )
    parser.add_argument(
        "--reset-state",
        action="store_true",
        help="Reset watermark checkpoint state to force full extraction on next run",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable detailed debug logs",
    )

    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    """Main CLI entrypoint."""
    args = parse_arguments(argv)
    setup_logging(args.verbose)

    # Initialize configuration
    out_dir = Path(args.output_dir)
    config = PipelineConfig(
        db=DatabaseConfig(),
        output_dir=out_dir,
        enable_db_metrics_table=args.save_to_db,
    )

    # Status check mode
    if args.status:
        state_mgr = StateManager(config.state_file)
        print("=" * 60)
        print("  EDUALTO ACADEMIC DATA PIPELINE - CHECKPOINT STATUS")
        print("=" * 60)
        print(f"Checkpoint file : {state_mgr.state_file_path}")
        print(f"Pipeline        : {state_mgr.state.pipeline_name} (v{state_mgr.state.version})")
        print(f"Last Watermark  : {state_mgr.state.last_watermark or 'None (Requires full run)'}")
        print(f"Last Run Time   : {state_mgr.state.last_successful_run_at or 'Never'}")
        print(f"Total Runs      : {state_mgr.state.total_runs}")
        print(f"Total Aggregated: {state_mgr.state.total_pairs_aggregated} student-course records")
        print("-" * 60)
        print("Recent Execution History:")
        if not state_mgr.state.history:
            print("  (No runs recorded yet)")
        else:
            for item in reversed(state_mgr.state.history[-5:]):
                status_icon = "✓" if item.get("status") == "SUCCESS" else "✗"
                print(f"  [{status_icon}] {item.get('timestamp')} | Mode: {item.get('mode')} | "
                      f"Pairs: {item.get('pairs_aggregated', 0)} | Duration: {item.get('duration_seconds')}s")
        print("=" * 60)
        return 0

    # Reset state mode
    if args.reset_state:
        state_mgr = StateManager(config.state_file)
        state_mgr.reset()
        print(f"[OK] Checkpoint state reset at: {config.state_file}")
        return 0

    # Test connection mode
    if args.test_connection:
        db_client = DatabaseClient(config.db)
        try:
            print("=" * 60)
            print("  TESTING POSTGRESQL DATABASE CONNECTION")
            print("=" * 60)
            health = db_client.test_connection()
            print(f"Status   : {health['status']}")
            print(f"Dialect  : {health['dialect']}")
            print(f"Host     : {health['host']}:{health['port']}")
            print(f"Database : {health['database']}")
            print(f"User     : {health['user']}")
            print(f"Latency  : {health['latency_ms']} ms")
            print(f"Version  : {health['version']}")
            print(f"DB Time  : {health['server_time']}")
            print("=" * 60)
            return 0
        except Exception as exc:
            print(f"[ERROR] Failed to connect to PostgreSQL: {exc}", file=sys.stderr)
            return 1
        finally:
            db_client.close()

    # Parse --since timestamp if supplied
    since_dt: Optional[datetime] = None
    if args.since:
        try:
            since_dt = datetime.fromisoformat(args.since)
        except ValueError as exc:
            print(f"[ERROR] Invalid --since timestamp format: {exc}. Expected ISO format.", file=sys.stderr)
            return 1

    # Execute Pipeline
    pipeline = AcademicPipeline(config=config)
    try:
        result = pipeline.run(
            mode=args.mode,
            since_override=since_dt,
            dry_run=args.dry_run,
            formats=args.format,
            export_entities=args.export_entities,
        )

        print("\n" + "=" * 60)
        print("  EDUALTO ACADEMIC PIPELINE EXECUTION SUMMARY")
        print("=" * 60)
        print(f"Mode            : {result['mode']}")
        print(f"Status          : {result['status']}")
        print(f"Duration        : {result.get('duration_seconds', 0)} seconds")
        print(f"Pairs Aggregated: {result.get('pairs_count', 0)}")
        if result.get("changed_pairs_count") is not None:
            print(f"Changed Pairs   : {result['changed_pairs_count']}")
        print(f"New Watermark   : {result.get('watermark')}")
        print("-" * 60)
        print("Exported Files:")
        for fmt, fpath in result.get("exported_files", {}).items():
            print(f"  • [{fmt.upper()}]: {fpath}")
        print("=" * 60 + "\n")
        return 0

    except Exception as exc:
        print(f"\n[FATAL] Pipeline failed: {exc}", file=sys.stderr)
        return 1
    finally:
        pipeline.db.close()


if __name__ == "__main__":
    sys.exit(main())
