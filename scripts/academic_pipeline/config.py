"""
Configuration management for EduAlto Academic Data Pipeline.
Loads settings from environment variables or .env file with intelligent defaults.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

try:
    from dotenv import load_dotenv
    # Load .env from project root if present
    project_root = Path(__file__).resolve().parent.parent.parent
    env_path = project_root / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()
except ImportError:
    pass


@dataclass
class DatabaseConfig:
    """PostgreSQL connection configuration."""
    host: str = field(default_factory=lambda: os.getenv("POSTGRES_HOST", "localhost"))
    port: int = field(default_factory=lambda: int(os.getenv("POSTGRES_PORT", "5432")))
    database: str = field(default_factory=lambda: os.getenv("POSTGRES_DB", "edualto"))
    user: str = field(default_factory=lambda: os.getenv("POSTGRES_USER", "edualto"))
    password: str = field(default_factory=lambda: os.getenv("POSTGRES_PASSWORD", os.getenv("SPRING_DATASOURCE_PASSWORD", "")))
    sslmode: str = field(default_factory=lambda: os.getenv("POSTGRES_SSLMODE", "prefer"))
    url_override: Optional[str] = field(default_factory=lambda: os.getenv("DATABASE_URL"))

    @classmethod
    def from_spring_url(cls, spring_url: str, user: str = "edualto", password: str = "") -> DatabaseConfig:
        """Parse JDBC URL e.g. jdbc:postgresql://localhost:5432/edualto."""
        clean_url = spring_url.replace("jdbc:", "") if spring_url.startswith("jdbc:") else spring_url
        parsed = urlparse(clean_url)
        return cls(
            host=parsed.hostname or "localhost",
            port=parsed.port or 5432,
            database=parsed.path.lstrip("/") or "edualto",
            user=user or parsed.username or "edualto",
            password=password or parsed.password or "",
        )

    def get_connection_url(self) -> str:
        """Return SQLAlchemy-compatible PostgreSQL connection URL."""
        if self.url_override:
            return self.url_override
        # Fallback to standard postgresql+psycopg2 connection string
        auth = f"{self.user}:{self.password}@" if self.user else ""
        return f"postgresql+psycopg2://{auth}{self.host}:{self.port}/{self.database}?sslmode={self.sslmode}"

    def get_dsn_dict(self) -> dict:
        """Return dictionary suitable for psycopg2 / psycopg direct connection."""
        return {
            "host": self.host,
            "port": self.port,
            "dbname": self.database,
            "user": self.user,
            "password": self.password,
            "sslmode": self.sslmode,
        }


@dataclass
class PipelineConfig:
    """Global configuration for the extraction and aggregation pipeline."""
    db: DatabaseConfig = field(default_factory=DatabaseConfig)
    output_dir: Path = field(default_factory=lambda: Path(os.getenv("ACADEMIC_EXPORT_DIR", "data/academic_exports")))
    state_file: Optional[Path] = None
    batch_size: int = field(default_factory=lambda: int(os.getenv("ACADEMIC_BATCH_SIZE", "1000")))
    default_format: str = field(default_factory=lambda: os.getenv("ACADEMIC_EXPORT_FORMAT", "all"))
    enable_db_metrics_table: bool = field(default_factory=lambda: os.getenv("SAVE_METRICS_TO_DB", "false").lower() in ("true", "1", "yes"))
    metrics_table_name: str = "academic_student_course_metrics"

    def __post_init__(self) -> None:
        self.output_dir = Path(self.output_dir).resolve()
        if self.state_file is None:
            self.state_file = self.output_dir / ".pipeline_state.json"
        else:
            self.state_file = Path(self.state_file).resolve()
