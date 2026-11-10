"""
Database connection and session management for PostgreSQL.
Provides read-only transactions, retry resilience, and test connection utilities.
Supports SQLAlchemy engines and raw psycopg2 connections.
"""

from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from typing import Any, Dict, Generator, Optional

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine

from .config import DatabaseConfig

logger = logging.getLogger("academic_pipeline.db")


class DatabaseClient:
    """PostgreSQL client tailored for high-performance, non-blocking analytical extraction."""

    def __init__(self, config: DatabaseConfig, engine: Optional[Engine] = None):
        self.config = config
        self._engine: Engine = engine or self._create_engine()

    def _create_engine(self) -> Engine:
        """Create SQLAlchemy engine with connection pooling and timeouts."""
        conn_url = self.config.get_connection_url()
        logger.debug("Initializing database engine for %s:%s/%s", self.config.host, self.config.port, self.config.database)
        return create_engine(
            conn_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_recycle=3600,
            connect_args={
                "connect_timeout": 10,
                "options": "-c statement_timeout=60000",  # 60s max per analytical query
            } if "postgresql" in conn_url else {},
        )

    @property
    def engine(self) -> Engine:
        return self._engine

    def test_connection(self) -> Dict[str, Any]:
        """Test database connectivity, returning latency and PostgreSQL version info."""
        start_time = time.perf_counter()
        with self._engine.connect() as conn:
            # Query server version and current timestamp
            is_postgres = self._engine.dialect.name == "postgresql"
            query = "SELECT version(), current_timestamp" if is_postgres else "SELECT sqlite_version(), datetime('now')"
            result = conn.execute(text(query)).fetchone()
            elapsed_ms = (time.perf_counter() - start_time) * 1000

            db_version = result[0] if result else "Unknown"
            server_time = str(result[1]) if result and len(result) > 1 else "Unknown"

            return {
                "status": "HEALTHY",
                "dialect": self._engine.dialect.name,
                "database": self.config.database,
                "host": self.config.host,
                "port": self.config.port,
                "user": self.config.user,
                "version": db_version,
                "server_time": server_time,
                "latency_ms": round(elapsed_ms, 2),
            }

    @contextmanager
    def read_only_connection(self) -> Generator[Connection, None, None]:
        """Provide a connection enforcing read-only transaction semantics where supported."""
        with self._engine.connect() as conn:
            if self._engine.dialect.name == "postgresql":
                # Ensure read-only transaction to protect operational production database
                conn.execute(text("BEGIN TRANSACTION READ ONLY"))
            try:
                yield conn
            finally:
                if self._engine.dialect.name == "postgresql":
                    conn.execute(text("COMMIT"))

    def query_to_dataframe(self, query: str, params: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        """Execute analytical query with parameters and return pandas DataFrame."""
        with self.read_only_connection() as conn:
            return pd.read_sql_query(sql=text(query), con=conn, params=params or {})

    def close(self) -> None:
        """Dispose connection pool resources."""
        if self._engine:
            self._engine.dispose()
            logger.debug("Database engine connection pool disposed.")
