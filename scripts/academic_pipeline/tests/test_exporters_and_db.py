"""
Tests for PostgreSQL object normalization in DatabaseClient and AcademicDataExporter.
"""

from __future__ import annotations

import decimal
import json
from pathlib import Path
import uuid

import pandas as pd

from scripts.academic_pipeline.db import DatabaseClient
from scripts.academic_pipeline.exporters import AcademicDataExporter


def test_normalize_dataframe_converts_uuid_jsonb_and_decimal() -> None:
    uid = uuid.UUID("0b431351-a632-50d3-a5cd-660ec48deb1a")
    df = pd.DataFrame([
        {
            "enrollment_id": uid,
            "source_id": None,
            "metadata": {"duration_seconds": 360, "note": "Tiếng Việt"},
            "score": decimal.Decimal("87.50"),
        },
        {
            "enrollment_id": uid,
            "source_id": uid,
            "metadata": None,
            "score": decimal.Decimal("90.00"),
        },
    ])

    normalized = DatabaseClient.normalize_dataframe(df.copy())
    assert normalized["enrollment_id"].tolist() == [str(uid), str(uid)]
    assert normalized["source_id"].tolist() == [None, str(uid)]
    assert json.loads(normalized.at[0, "metadata"]) == {"duration_seconds": 360, "note": "Tiếng Việt"}
    assert normalized.at[1, "metadata"] is None
    assert normalized["score"].tolist() == [87.5, 90.0]


def test_exporter_handles_uuid_and_dict_across_all_formats(tmp_path: Path) -> None:
    uid = uuid.UUID("20e6119f-31c2-5f21-b083-75fa07b1a5a3")
    df = pd.DataFrame([
        {
            "enrollment_id": uid,
            "student_name": "Nguyễn Văn Hoàng",
            "metadata": {"lesson_type": "VIDEO", "duration_seconds": 420},
            "last_activity_at": "2026-11-10T15:30:00Z",
        },
        {
            "enrollment_id": uuid.UUID("ba4f6ef2-66e2-5446-9123-2bc46eaa8aac"),
            "student_name": "Trần Thị Thảo",
            "metadata": None,
            "last_activity_at": None,
        },
    ])

    exporter = AcademicDataExporter(tmp_path)
    exported = exporter.export_all(df, formats=["csv", "json", "jsonl", "parquet"])

    assert set(exported.keys()) == {"csv", "json", "jsonl", "parquet"}
    parsed_json = json.loads(exported["json"].read_text(encoding="utf-8"))
    assert parsed_json[0]["enrollment_id"] == str(uid)
    assert parsed_json[0]["student_name"] == "Nguyễn Văn Hoàng"
    assert json.loads(parsed_json[0]["metadata"]) == {"lesson_type": "VIDEO", "duration_seconds": 420}
    assert pd.read_parquet(exported["parquet"])["enrollment_id"].iloc[0] == str(uid)
