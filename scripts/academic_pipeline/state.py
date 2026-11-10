"""
State and checkpoint management for incremental extraction.
Tracks watermarks (last_extracted_at timestamps), run status, and metrics history.
Uses atomic file writes to ensure data integrity.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("academic_pipeline.state")


@dataclass
class RunSummary:
    """Summary metadata of a single pipeline execution."""
    timestamp: str
    mode: str
    status: str
    duration_seconds: float
    pairs_aggregated: int
    tables_extracted: Dict[str, int] = field(default_factory=dict)
    error_message: Optional[str] = None


@dataclass
class CheckpointState:
    """Persistent state representation for incremental data synchronization."""
    pipeline_name: str = "EduAlto Academic Data Pipeline"
    version: str = "1.0.0"
    last_watermark: Optional[str] = None
    last_successful_run_at: Optional[str] = None
    total_runs: int = 0
    total_pairs_aggregated: int = 0
    history: List[Dict[str, Any]] = field(default_factory=list)


class StateManager:
    """Manages loading, updating, and saving extraction watermarks atomically."""

    def __init__(self, state_file_path: Path):
        self.state_file_path = Path(state_file_path).resolve()
        self.state: CheckpointState = self._load()

    def _load(self) -> CheckpointState:
        """Load state from disk, or return fresh state if file does not exist or is invalid."""
        if not self.state_file_path.exists():
            logger.info("No checkpoint file found at %s. A new checkpoint will be created.", self.state_file_path)
            return CheckpointState()

        try:
            with open(self.state_file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return CheckpointState(
                pipeline_name=data.get("pipeline_name", "EduAlto Academic Data Pipeline"),
                version=data.get("version", "1.0.0"),
                last_watermark=data.get("last_watermark"),
                last_successful_run_at=data.get("last_successful_run_at"),
                total_runs=data.get("total_runs", 0),
                total_pairs_aggregated=data.get("total_pairs_aggregated", 0),
                history=data.get("history", []),
            )
        except Exception as exc:
            logger.warning("Failed to parse checkpoint file (%s): %s. Initializing fresh state.", self.state_file_path, exc)
            return CheckpointState()

    def get_watermark(self) -> Optional[datetime]:
        """Return the last extraction watermark as UTC datetime, or None if full extraction required."""
        if not self.state.last_watermark:
            return None
        try:
            return datetime.fromisoformat(self.state.last_watermark)
        except ValueError:
            logger.warning("Invalid ISO watermark in state: %s", self.state.last_watermark)
            return None

    def record_successful_run(
        self,
        new_watermark: datetime,
        mode: str,
        duration_seconds: float,
        pairs_aggregated: int,
        tables_extracted: Dict[str, int],
    ) -> None:
        """Update watermark and record run history upon successful pipeline completion."""
        now_utc = datetime.now(timezone.utc).isoformat()
        watermark_iso = new_watermark.isoformat()

        self.state.last_watermark = watermark_iso
        self.state.last_successful_run_at = now_utc
        self.state.total_runs += 1
        self.state.total_pairs_aggregated += pairs_aggregated

        run_record = asdict(
            RunSummary(
                timestamp=now_utc,
                mode=mode,
                status="SUCCESS",
                duration_seconds=round(duration_seconds, 2),
                pairs_aggregated=pairs_aggregated,
                tables_extracted=tables_extracted,
            )
        )
        # Keep recent 20 runs
        self.state.history.append(run_record)
        if len(self.state.history) > 20:
            self.state.history = self.state.history[-20:]

        self._save()

    def record_failed_run(self, mode: str, duration_seconds: float, error_message: str) -> None:
        """Record run failure without advancing watermark."""
        now_utc = datetime.now(timezone.utc).isoformat()
        run_record = asdict(
            RunSummary(
                timestamp=now_utc,
                mode=mode,
                status="FAILED",
                duration_seconds=round(duration_seconds, 2),
                pairs_aggregated=0,
                error_message=error_message,
            )
        )
        self.state.history.append(run_record)
        if len(self.state.history) > 20:
            self.state.history = self.state.history[-20:]
        self._save()

    def reset(self) -> None:
        """Reset state, forcing subsequent runs to execute a full extraction."""
        logger.info("Resetting pipeline checkpoint state at %s", self.state_file_path)
        self.state = CheckpointState()
        self._save()

    def _save(self) -> None:
        """Save checkpoint to disk atomically using a temp file."""
        self.state_file_path.parent.mkdir(parents=True, exist_ok=True)
        data = asdict(self.state)

        # Write to temp file in same directory then atomically rename
        temp_dir = self.state_file_path.parent
        with tempfile.NamedTemporaryFile("w", dir=temp_dir, delete=False, encoding="utf-8") as tf:
            json.dump(data, tf, indent=2, ensure_ascii=False)
            temp_name = tf.name

        try:
            # Atomic rename (on Windows, os.replace handles atomic overwrite)
            os.replace(temp_name, self.state_file_path)
            logger.debug("Successfully saved checkpoint to %s", self.state_file_path)
        except Exception:
            if os.path.exists(temp_name):
                os.remove(temp_name)
            raise
