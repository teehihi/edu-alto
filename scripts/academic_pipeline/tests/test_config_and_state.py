"""
Tests for configuration parsing and state checkpoint management.
"""

from datetime import datetime, timezone
from pathlib import Path

from scripts.academic_pipeline.config import DatabaseConfig, PipelineConfig
from scripts.academic_pipeline.state import CheckpointState, StateManager


def test_database_config_defaults():
    db = DatabaseConfig(host="pg.internal", port=5432, database="edualto_prod", user="edu_app")
    url = db.get_connection_url()
    assert "postgresql+psycopg2://" in url
    assert "pg.internal:5432/edualto_prod" in url
    assert "sslmode=prefer" in url


def test_database_config_from_spring_url():
    spring_url = "jdbc:postgresql://db-cluster:5433/edualto_custom"
    db = DatabaseConfig.from_spring_url(spring_url, user="custom_user", password="secret_pwd")
    assert db.host == "db-cluster"
    assert db.port == 5433
    assert db.database == "edualto_custom"
    assert db.user == "custom_user"
    assert db.password == "secret_pwd"


def test_state_manager_lifecycle(temp_dir: Path):
    state_file = temp_dir / ".pipeline_state.json"
    mgr = StateManager(state_file)

    # Initial state should be fresh
    assert mgr.get_watermark() is None
    assert mgr.state.total_runs == 0

    # Record first successful run
    now = datetime(2026, 11, 10, 10, 0, 0, tzinfo=timezone.utc)
    mgr.record_successful_run(
        new_watermark=now,
        mode="FULL",
        duration_seconds=5.25,
        pairs_aggregated=42,
        tables_extracted={"enrollments": 42},
    )

    assert mgr.get_watermark() == now
    assert mgr.state.total_runs == 1
    assert mgr.state.total_pairs_aggregated == 42
    assert len(mgr.state.history) == 1
    assert mgr.state.history[0]["mode"] == "FULL"

    # Reload from disk into a new manager instance
    reloaded_mgr = StateManager(state_file)
    assert reloaded_mgr.get_watermark() == now
    assert reloaded_mgr.state.total_runs == 1
    assert reloaded_mgr.state.total_pairs_aggregated == 42

    # Reset
    reloaded_mgr.reset()
    assert reloaded_mgr.get_watermark() is None
    assert reloaded_mgr.state.total_runs == 0
