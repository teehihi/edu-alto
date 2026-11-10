"""
Test configuration and fixtures for Academic Pipeline tests.
Provides in-memory database schemas and mock EduAlto learning data.
"""

import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Generator

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from scripts.academic_pipeline.config import DatabaseConfig, PipelineConfig
from scripts.academic_pipeline.db import DatabaseClient


@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Temporary directory for export outputs and state files during testing."""
    with tempfile.TemporaryDirectory() as td:
        yield Path(td)


@pytest.fixture
def sqlite_engine() -> Generator[Engine, None, None]:
    """In-memory SQLite engine simulating EduAlto's PostgreSQL tables."""
    engine = create_engine("sqlite:///:memory:")
    
    # Create EduAlto schema compatible with SQLite
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """))

        conn.execute(text("""
            CREATE TABLE courses (
                id TEXT PRIMARY KEY,
                instructor_id TEXT NOT NULL,
                title TEXT NOT NULL,
                slug TEXT NOT NULL,
                level TEXT DEFAULT 'BEGINNER',
                status TEXT DEFAULT 'PUBLISHED',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """))

        conn.execute(text("""
            CREATE TABLE sections (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                title TEXT NOT NULL,
                position INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """))

        conn.execute(text("""
            CREATE TABLE lessons (
                id TEXT PRIMARY KEY,
                section_id TEXT NOT NULL,
                title TEXT NOT NULL,
                lesson_type TEXT DEFAULT 'VIDEO',
                position INTEGER NOT NULL,
                duration_seconds INTEGER DEFAULT 600,
                status TEXT DEFAULT 'PUBLISHED',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """))

        conn.execute(text("""
            CREATE TABLE enrollments (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                course_id TEXT NOT NULL,
                status TEXT DEFAULT 'ACTIVE',
                enrolled_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """))

        conn.execute(text("""
            CREATE TABLE learning_progress (
                id TEXT PRIMARY KEY,
                enrollment_id TEXT NOT NULL,
                course_id TEXT NOT NULL,
                section_id TEXT NOT NULL,
                lesson_id TEXT NOT NULL,
                completed_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """))

        conn.execute(text("""
            CREATE TABLE quizzes (
                id TEXT PRIMARY KEY,
                lesson_id TEXT NOT NULL,
                passing_score REAL DEFAULT 80.0,
                created_at TEXT NOT NULL
            );
        """))

        conn.execute(text("""
            CREATE TABLE quiz_attempts (
                id TEXT PRIMARY KEY,
                quiz_id TEXT NOT NULL,
                student_id TEXT NOT NULL,
                score REAL NOT NULL,
                correct_answers INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                passed INTEGER NOT NULL,
                submitted_at TEXT NOT NULL
            );
        """))

        conn.execute(text("""
            CREATE TABLE assignments (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                title TEXT NOT NULL,
                max_score REAL DEFAULT 100.0,
                status TEXT DEFAULT 'PUBLISHED',
                due_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """))

        conn.execute(text("""
            CREATE TABLE assignment_submissions (
                id TEXT PRIMARY KEY,
                assignment_id TEXT NOT NULL,
                student_id TEXT NOT NULL,
                submitted_at TEXT NOT NULL,
                score REAL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """))

        conn.execute(text("""
            CREATE TABLE discussions (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                lesson_id TEXT NOT NULL,
                author_id TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                video_timestamp_seconds INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted_at TEXT
            );
        """))

        conn.execute(text("""
            CREATE TABLE discussion_comments (
                id TEXT PRIMARY KEY,
                discussion_id TEXT NOT NULL,
                author_id TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted_at TEXT
            );
        """))

        conn.execute(text("""
            CREATE TABLE certificates (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                course_id TEXT NOT NULL,
                certificate_number TEXT NOT NULL,
                issued_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """))

        conn.execute(text("""
            CREATE TABLE course_reviews (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                course_id TEXT NOT NULL,
                rating INTEGER NOT NULL,
                status TEXT DEFAULT 'PUBLISHED',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """))

        conn.execute(text("""
            CREATE TABLE learning_notes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                lesson_id TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """))

    yield engine
    engine.dispose()


@pytest.fixture
def mock_db_client(sqlite_engine: Engine) -> DatabaseClient:
    """DatabaseClient using the SQLite test engine."""
    config = DatabaseConfig(database="test_edualto")
    return DatabaseClient(config=config, engine=sqlite_engine)
