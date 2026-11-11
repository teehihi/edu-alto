#!/usr/bin/env python3
"""
Deterministic & Idempotent Synthetic Student Cohort Seeder for EduAlto LMS.

Populates PostgreSQL (`edualto`) with ~300 realistic Vietnamese students enrolled
across 5 rich courses with coherent curriculum, progress, quizzes, assignments,
notes, discussions, reviews, certificates, and V34 `learning_activities` telemetry.

Safety guarantees:
- Only creates cohort-namespaced accounts (`@cohort.edualto.local`,
  `@cohort.instructor.edualto.local`) and `cohort-*` courses using deterministic UUIDv5.
- Never modifies or deletes existing manually created users/courses.
- Refuses non-local PostgreSQL hosts unless `--allow-remote` is explicitly passed.
- Uses timezone-aware UTC timestamps strictly <= reference_now so V34's
  `chk_learning_activity_time` constraint is always respected.
"""

from __future__ import annotations

import argparse
import json
import logging
import random
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple
from zoneinfo import ZoneInfo

import psycopg2
from psycopg2.extras import execute_values

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.academic_pipeline.config import DatabaseConfig

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

logger = logging.getLogger("seed_dev_cohort")

VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")
COHORT_NAMESPACE = uuid.UUID("7f3c8b2e-94a1-4c8d-b5f0-31e9a870c210")
COHORT_STUDENT_DOMAIN = "@cohort.edualto.local"
COHORT_INSTRUCTOR_DOMAIN = "@cohort.instructor.edualto.local"
COHORT_SLUG_PREFIX = "cohort-"
LOCAL_DB_HOSTS = {"localhost", "127.0.0.1", "::1"}

# Shared Bcrypt hash matching seed-dev-courses.sql dev demo credentials
DEMO_PASSWORD_HASH = "$2a$10$8/HbXTdva9/yU9fAFj6c1.mlFfUjjXPOXe2s2Xslh14CvAjpSnqKO"

SURNAMES = [
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan",
    "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý",
]
MIDDLE_NAMES = [
    "Văn", "Thị", "Minh", "Nhật", "Công", "Đức", "Gia",
    "Thanh", "Quốc", "Hồng", "Ngọc", "Phương", "Anh", "Tuấn",
]
GIVEN_NAMES = [
    "An", "Anh", "Bảo", "Bình", "Châu", "Dũng", "Dương", "Đạt",
    "Giang", "Hà", "Hải", "Hằng", "Hiếu", "Hoài", "Hùng", "Huy",
    "Hương", "Khanh", "Khoa", "Khôi", "Kiên", "Lam", "Linh", "Long",
    "Mai", "Minh", "My", "Nam", "Ngân", "Ngọc", "Nguyên", "Nhung",
    "Phát", "Phong", "Phúc", "Phương", "Quân", "Quang", "Quyên", "Sơn",
    "Tâm", "Tân", "Thảo", "Thịnh", "Thu", "Thủy", "Tiến", "Trang",
    "Trinh", "Trung", "Tú", "Tuấn", "Tùng", "Uyên", "Vân", "Việt",
    "Vinh", "Vy", "Xuân", "Yến",
]

OCCUPATIONS = [
    ("Sinh viên Công nghệ thông tin", "Đại học"),
    ("Lập trình viên Backend", "Đại học"),
    ("Lập trình viên Frontend", "Đại học"),
    ("Chuyên viên phân tích dữ liệu", "Đại học"),
    ("Thiết kế giao diện UI/UX", "Cao đẳng"),
    ("Kiểm thử phần mềm (QA/QC)", "Đại học"),
    ("Kỹ sư dữ liệu tập sự", "Đại học"),
    ("Nhân viên vận hành sản phẩm số", "Thạc sĩ"),
]

LEARNING_GOALS = [
    "Nâng cao kỹ năng lập trình và hoàn thành dự án thực tế cuối khóa.",
    "Chuyển hướng nghề nghiệp sang lĩnh vực phát triển phần mềm và dữ liệu.",
    "Hệ thống hóa kiến thức nền tảng và chuẩn bị cho kỳ phỏng vấn kỹ thuật.",
    "Ứng dụng phân tích dữ liệu và tự động hóa quy trình vào công việc hằng ngày.",
    "Xây dựng portfolio học thuật và đạt chứng chỉ hoàn thành khóa học.",
]

POSITIVE_REVIEWS = [
    "Khóa học trình bày rõ ràng, bài tập thực hành bám sát tình huống thực tế.",
    "Giảng viên giải thích dễ hiểu, tài liệu đính kèm và quiz ôn tập rất hữu ích.",
    "Lộ trình từ cơ bản đến nâng cao hợp lý, giúp mình nắm chắc kiến thức cốt lõi.",
    "Video ngắn gọn trọng tâm, phần bài tập tự luận phản hồi rất chi tiết.",
]

NEUTRAL_REVIEWS = [
    "Nội dung khóa học ổn áp, một vài phần nâng cao cần tự đọc thêm tài liệu.",
    "Kiến thức đầy đủ nhưng mình mong có thêm nhiều bài tập luyện tập hơn nữa.",
]

NOTE_TITLES = [
    "Điểm mấu chốt cần nhớ",
    "Tóm tắt luồng xử lý chính",
    "Lưu ý khi triển khai thực tế",
    "Câu lệnh và cấu hình quan trọng",
    "Checklist ôn tập trước quiz",
]

NOTE_BODIES = [
    "Cần nắm rõ nguyên tắc phân tách trách nhiệm giữa các lớp để dễ mở rộng và kiểm thử.",
    "Chú ý xử lý biên dữ liệu đầu vào, giá trị null và múi giờ Asia/Ho_Chi_Minh khi tổng hợp.",
    "Kiểm tra kỹ ràng buộc khóa ngoại và chỉ mục trước khi chạy truy vấn tổng hợp lớn.",
    "Ghi nhớ công thức chuẩn hóa dữ liệu và cách đánh giá chỉ số theo từng nhóm hành vi.",
]

QUESTION_TEMPLATES = [
    (
        "Thắc mắc về phần triển khai ở bài {lesson_title}",
        "Thầy/cô và các bạn cho em hỏi khi áp dụng phần kiến thức trong bài {lesson_title} thì cần lưu ý lỗi phổ biến nào ạ?",
    ),
    (
        "Cách tối ưu bước xử lý trong {lesson_title}",
        "Em đã chạy thử ví dụ theo hướng dẫn của {lesson_title}, nhưng muốn hỏi thêm cách kiểm tra trường hợp dữ liệu ngoại lệ.",
    ),
    (
        "So sánh phương án thực hành ở {lesson_title}",
        "Trong tình huống dự án thực tế có lượng bản ghi lớn thì nên ưu tiên cách tiếp cận nào trong bài {lesson_title} ạ?",
    ),
]

STUDENT_COMMENT_TEMPLATES = [
    "Mình cũng gặp tình huống tương tự ở bài này, kiểm tra lại kiểu dữ liệu đầu vào là chạy ổn nhé.",
    "Cảm ơn bạn đã đặt câu hỏi rất trúng trọng tâm, phần này mình cũng đang ôn kỹ lại.",
    "Theo mình thấy làm theo ví dụ số 2 trong tài liệu đính kèm sẽ dễ theo dõi hơn.",
]

INSTRUCTOR_REPLY_TEMPLATES = [
    "Chào bạn, câu hỏi rất tốt. Bạn kiểm tra kỹ lại ràng buộc dữ liệu và thứ tự xử lý như trong slide trang 4 nhé.",
    "Khi dữ liệu lớn, bạn nên kết hợp chỉ mục hợp lý và chạy kiểm thử từng bước nhỏ trước khi gộp toàn bộ.",
    "Đúng rồi, ngoài ra nhớ kiểm tra log ở bước đầu tiên để phát hiện sớm bản ghi bị thiếu định danh.",
]

PERSONA_WEIGHTS: List[Tuple[str, float]] = [
    ("COMPLETED", 0.22),
    ("EXCELLING", 0.16),
    ("ON_TRACK", 0.28),
    ("STRUGGLING", 0.12),
    ("AT_RISK_DROPOUT", 0.14),
    ("JUST_STARTED", 0.08),
]


def det_uuid(key: str) -> uuid.UUID:
    """Return a deterministic UUIDv5 within the cohort namespace."""
    return uuid.uuid5(COHORT_NAMESPACE, key)


@dataclass(frozen=True)
class LessonSpec:
    offset: int
    title: str
    lesson_type: str
    duration_seconds: int
    has_attachment: bool = False
    attachment_name: str = ""
    question_count: int = 0


@dataclass(frozen=True)
class CourseSpec:
    code: str
    instructor_idx: int
    title: str
    slug: str
    tagline: str
    description: str
    level: str
    price: float
    original_price: float
    sections: Tuple[Tuple[str, Tuple[LessonSpec, ...]], ...]


COURSE_SPECS: Tuple[CourseSpec, ...] = (
    CourseSpec(
        code="C01",
        instructor_idx=0,
        title="Phân tích Dữ liệu Học tập với Python & Pandas",
        slug="cohort-python-data-analytics",
        tagline="Làm chủ quy trình ETL, làm sạch dữ liệu và trực quan hóa với Pandas & NumPy",
        description="Khóa học thực hành xây dựng pipeline dữ liệu Python từ PostgreSQL đến tập dữ liệu sạch phục vụ phân tích và AI.",
        level="INTERMEDIATE",
        price=499000.0,
        original_price=990000.0,
        sections=(
            (
                "Chương 1: Nền tảng Python & Trích xuất Dữ liệu",
                (
                    LessonSpec(1, "Tổng quan Data Engineering trong LMS", "VIDEO", 720, True, "slide-chuong-1-etl.pdf"),
                    LessonSpec(2, "Kết nối PostgreSQL an toàn với SQLAlchemy", "TEXT", 480),
                    LessonSpec(3, "Kỹ thuật trích xuất gia tăng theo Watermark", "VIDEO", 840),
                    LessonSpec(4, "Quiz 1: Kiến thức nền tảng ETL", "QUIZ", 600, question_count=10),
                ),
            ),
            (
                "Chương 2: Làm sạch & Chuẩn hóa Dữ liệu với Pandas",
                (
                    LessonSpec(5, "Xử lý giá trị khuyết thiếu và dữ liệu trùng lặp", "VIDEO", 900, True, "notebook-lam-sach-du-lieu.zip"),
                    LessonSpec(6, "Phát hiện ngoại lai bằng IQR và Z-Score", "TEXT", 540),
                    LessonSpec(7, "Quiz 2: Làm sạch & Xác thực chất lượng dữ liệu", "QUIZ", 900, question_count=20),
                ),
            ),
            (
                "Chương 3: Feature Store & Xuất Dữ liệu Phân tích",
                (
                    LessonSpec(8, "Tổng hợp chỉ số đa chiều Student-Course", "VIDEO", 960),
                    LessonSpec(9, "Xuất dữ liệu Apache Parquet và lập Quality Report", "TEXT", 600),
                ),
            ),
        ),
    ),
    CourseSpec(
        code="C02",
        instructor_idx=1,
        title="Phát triển Ứng dụng Web Fullstack Next.js & Spring Boot",
        slug="cohort-web-fullstack-nextjs-spring",
        tagline="Thiết kế kiến trúc Modular Monolith kết hợp Next.js App Router và JWT RBAC",
        description="Xây dựng ứng dụng web học tập trực tuyến hoàn chỉnh với Spring Boot 4, PostgreSQL, Redis và Next.js TypeScript.",
        level="INTERMEDIATE",
        price=690000.0,
        original_price=1350000.0,
        sections=(
            (
                "Chương 1: Kiến trúc Modular Monolith & Security",
                (
                    LessonSpec(1, "Tổ chức module nghiệp vụ và luồng phụ thuộc", "VIDEO", 780, True, "blueprint-modular-monolith.pdf"),
                    LessonSpec(2, "Xác thực JWT và phân quyền RBAC động", "TEXT", 540),
                    LessonSpec(3, "Thiết kế API RESTful nhất quán và xử lý lỗi", "VIDEO", 860),
                    LessonSpec(4, "Quiz 1: Kiến trúc Backend & Bảo mật API", "QUIZ", 600, question_count=10),
                ),
            ),
            (
                "Chương 2: Giao diện React, State & Telemetry",
                (
                    LessonSpec(5, "Xây dựng Custom Hooks tái sử dụng với TypeScript", "VIDEO", 920, True, "starter-frontend-hooks.zip"),
                    LessonSpec(6, "Quản lý sự kiện tương tác học tập & pagehide beacon", "TEXT", 500),
                    LessonSpec(7, "Quiz 2: Frontend Next.js & Telemetry", "QUIZ", 900, question_count=20),
                ),
            ),
            (
                "Chương 3: Tối ưu Caching Redis & Kiểm thử Tích hợp",
                (
                    LessonSpec(8, "Kiểm thử tích hợp với Testcontainers PostgreSQL", "VIDEO", 940),
                    LessonSpec(9, "Chiến lược Redis Cache và triển khai sản phẩm", "TEXT", 580),
                ),
            ),
        ),
    ),
    CourseSpec(
        code="C03",
        instructor_idx=2,
        title="Thiết kế Cơ sở Dữ liệu PostgreSQL & Tối ưu Truy vấn",
        slug="cohort-sql-postgresql-mastery",
        tagline="Mô hình hóa quan hệ, Flyway Migration, Indexing và phân tích Query Plan",
        description="Chuyên sâu thiết kế bảng, ràng buộc toàn vẹn, Partial Index, JSONB và xử lý múi giờ trong hệ thống PostgreSQL lớn.",
        level="ADVANCED",
        price=590000.0,
        original_price=1190000.0,
        sections=(
            (
                "Chương 1: Thiết kế Schema & Ràng buộc Toàn vẹn",
                (
                    LessonSpec(1, "Chuẩn hóa lược đồ, Khóa ngoại phức hợp và Check Constraints", "VIDEO", 750, True, "erd-checklist-postgresql.pdf"),
                    LessonSpec(2, "Quản lý phiên bản schema an toàn với Flyway", "TEXT", 510),
                    LessonSpec(3, "Thiết kế bảng nhật ký sự kiện TIMESTAMPTZ & JSONB", "VIDEO", 890),
                    LessonSpec(4, "Quiz 1: Thiết kế Schema & Migration", "QUIZ", 600, question_count=10),
                ),
            ),
            (
                "Chương 2: B-Tree, Partial Index & Time-Series Queries",
                (
                    LessonSpec(5, "Chiến lược Composite Index và Partial Index tối ưu RAM", "VIDEO", 930, True, "sql-tuning-labs.sql"),
                    LessonSpec(6, "Xử lý múi giờ Asia/Ho_Chi_Minh với AT TIME ZONE", "TEXT", 490),
                    LessonSpec(7, "Quiz 2: Indexing & Tối ưu Câu truy vấn", "QUIZ", 900, question_count=20),
                ),
            ),
            (
                "Chương 3: Giám sát Hiệu năng & Idempotent Backfill",
                (
                    LessonSpec(8, "Đọc hiểu EXPLAIN ANALYZE cho truy vấn phân tích", "VIDEO", 980),
                    LessonSpec(9, "Thiết kế tác vụ ON CONFLICT DO NOTHING an toàn", "TEXT", 570),
                ),
            ),
        ),
    ),
    CourseSpec(
        code="C04",
        instructor_idx=1,
        title="Thiết kế UI/UX & Hệ thống Design System với Figma",
        slug="cohort-uiux-figma-product",
        tagline="Quy trình Product Design, Design Tokens, Accessibility và Responsive Layout",
        description="Thực hành xây dựng hệ thống giao diện LMS nhất quán từ wireframe, Design Tokens đến kiểm thử khả năng truy cập WCAG.",
        level="BEGINNER",
        price=0.0,
        original_price=450000.0,
        sections=(
            (
                "Chương 1: Tư duy Sản phẩm & Wireframing",
                (
                    LessonSpec(1, "Nghiên cứu hành vi người học trên nền tảng LMS", "VIDEO", 660, True, "ux-research-template.pdf"),
                    LessonSpec(2, "Cấu trúc thông tin và luồng người dùng cốt lõi", "TEXT", 460),
                    LessonSpec(3, "Thiết lập lưới Responsive cho Desktop, Tablet và Mobile", "VIDEO", 780),
                    LessonSpec(4, "Quiz 1: Nguyên lý UX & Cấu trúc Bố cục", "QUIZ", 600, question_count=10),
                ),
            ),
            (
                "Chương 2: Design Tokens & Component Library",
                (
                    LessonSpec(5, "Chuẩn hóa bảng màu, Typography và Focus Ring", "VIDEO", 840, True, "edualto-tokens-guide.pdf"),
                    LessonSpec(6, "Thiết kế trạng thái Loading, Empty, Error và Disabled", "TEXT", 480),
                    LessonSpec(7, "Quiz 2: Design System & Accessibility", "QUIZ", 900, question_count=20),
                ),
            ),
            (
                "Chương 3: Prototype & Bàn giao cho Lập trình viên",
                (
                    LessonSpec(8, "Interactive Prototype và Micro-interactions hợp lý", "VIDEO", 870),
                    LessonSpec(9, "Dev Handoff và đánh giá UI thực tế trên trình duyệt", "TEXT", 520),
                ),
            ),
        ),
    ),
    CourseSpec(
        code="C05",
        instructor_idx=0,
        title="Nhập môn Machine Learning Dự báo Kết quả Học tập",
        slug="cohort-machine-learning-edu",
        tagline="Xây dựng mô hình dự báo nguy cơ bỏ học và khuyến nghị học tập cá nhân hóa",
        description="Ứng dụng Scikit-learn và kỹ thuật Feature Engineering trên dữ liệu hành vi LMS để dự báo học lực và cảnh báo sớm.",
        level="BEGINNER",
        price=550000.0,
        original_price=1100000.0,
        sections=(
            (
                "Chương 1: Bài toán Learning Analytics & Feature Engineering",
                (
                    LessonSpec(1, "Giới thiệu mô hình cảnh báo sớm Early Warning System", "VIDEO", 700, True, "ml-lms-roadmap.pdf"),
                    LessonSpec(2, "Biến đổi thang điểm Min-Max và mã hóa đặc trưng hành vi", "TEXT", 490),
                    LessonSpec(3, "Tránh rò rỉ dữ liệu Data Leakage trong chuỗi thời gian", "VIDEO", 850),
                    LessonSpec(4, "Quiz 1: Feature Engineering cho Learning Analytics", "QUIZ", 600, question_count=10),
                ),
            ),
            (
                "Chương 2: Phân loại Học viên At-Risk & Hồi quy Điểm số",
                (
                    LessonSpec(5, "Huấn luyện Logistic Regression, Random Forest và XGBoost", "VIDEO", 910, True, "ml-classification-lab.zip"),
                    LessonSpec(6, "Đánh giá mô hình bằng Precision, Recall, F1 và ROC-AUC", "TEXT", 530),
                    LessonSpec(7, "Quiz 2: Đánh giá Mô hình & Cân bằng Lớp", "QUIZ", 900, question_count=20),
                ),
            ),
            (
                "Chương 3: Giải thích Dự báo & Gợi ý Can thiệp",
                (
                    LessonSpec(8, "Phân tích Feature Importance để giải thích nguyên nhân rủi ro", "VIDEO", 940),
                    LessonSpec(9, "Tích hợp điểm dự báo vào quy trình vận hành LMS", "TEXT", 560),
                ),
            ),
        ),
    ),
)

INSTRUCTORS_SPEC = (
    (
        "TS. Trần Hoàng Minh",
        f"cohort.inst.01{COHORT_INSTRUCTOR_DOMAIN}",
        "Kiến trúc sư Dữ liệu & AI trong Giáo dục",
        11,
        "Giảng dạy và tư vấn xây dựng hệ thống phân tích dữ liệu giáo dục số hơn 11 năm.",
        "Tiến sĩ Hệ thống Thông tin, Chuyên gia Python & Machine Learning",
        "Python, Pandas, Machine Learning, Modular Monolith",
    ),
    (
        "ThS. Lê Ngọc Khánh Linh",
        f"cohort.inst.02{COHORT_INSTRUCTOR_DOMAIN}",
        "Kỹ sư Fullstack & Thiết kế Sản phẩm Số",
        8,
        "Lead Engineer phụ trách thiết kế hệ thống web React, Next.js và Design System.",
        "Thạc sĩ Công nghệ Phần mềm, Google UX Design Certificate",
        "Next.js, React, TypeScript, UI/UX, Spring Boot",
    ),
    (
        "KS. Phạm Quang Huy",
        f"cohort.inst.03{COHORT_INSTRUCTOR_DOMAIN}",
        "Chuyên gia Kiến trúc Cơ sở Dữ liệu PostgreSQL",
        10,
        "Tư vấn thiết kế schema và tối ưu truy vấn phân tích tải lớn cho các nền tảng EdTech.",
        "Kỹ sư Khoa học Máy tính, PostgreSQL Certified Engineer",
        "PostgreSQL, SQL Tuning, Data Warehousing, Flyway",
    ),
)


@dataclass
class CohortDataset:
    reference_now: datetime
    seed: int
    student_count: int
    instructors: List[Dict[str, Any]]
    students: List[Dict[str, Any]]
    courses: List[Dict[str, Any]]
    sections: List[Dict[str, Any]]
    lessons: List[Dict[str, Any]]
    lesson_attachments: List[Dict[str, Any]]
    quizzes: List[Dict[str, Any]]
    quiz_questions: List[Dict[str, Any]]
    quiz_options: List[Dict[str, Any]]
    assignments: List[Dict[str, Any]]
    enrollments: List[Dict[str, Any]]
    learning_progress: List[Dict[str, Any]]
    quiz_attempts: List[Dict[str, Any]]
    quiz_attempt_sessions: List[Dict[str, Any]]
    quiz_attempt_answers: List[Dict[str, Any]]
    assignment_submissions: List[Dict[str, Any]]
    learning_notes: List[Dict[str, Any]]
    discussions: List[Dict[str, Any]]
    discussion_comments: List[Dict[str, Any]]
    course_reviews: List[Dict[str, Any]]
    certificates: List[Dict[str, Any]]
    learning_activities: List[Dict[str, Any]]
    persona_summary: Dict[str, int]


def _clamp_time(ts: datetime, reference_now: datetime) -> datetime:
    """Guarantee timestamps stay strictly <= reference_now in UTC."""
    ts_utc = ts.astimezone(timezone.utc)
    if ts_utc > reference_now:
        return reference_now
    return ts_utc


def _pick_vn_study_timestamp(rng: random.Random, days_ago: int, reference_now: datetime, late_night_bias: bool = False) -> datetime:
    """
    Generate realistic Vietnamese study timestamps across daytime, evening, and
    early-morning hours (including UTC cross-midnight windows like 20:00-23:45 VN
    and 05:15-06:45 VN).
    """
    ref_vn = reference_now.astimezone(VN_TZ)
    target_date = (ref_vn - timedelta(days=days_ago)).date()

    roll = rng.random()
    if late_night_bias or roll < 0.45:
        # Evening VN: 19:30 - 23:45 Asia/Ho_Chi_Minh (= 12:30 - 16:45 UTC)
        hour = rng.randint(19, 23)
        minute = rng.randint(0, 45) if hour == 23 else rng.randint(0, 59)
    elif roll < 0.60:
        # Early morning VN before work: 05:15 - 06:50 Asia/Ho_Chi_Minh (= 22:15 - 23:50 UTC prev day)
        hour = rng.randint(5, 6)
        minute = rng.randint(15, 55) if hour == 5 else rng.randint(0, 50)
    else:
        # Daytime / afternoon VN: 08:30 - 17:30 Asia/Ho_Chi_Minh
        hour = rng.randint(8, 17)
        minute = rng.randint(0, 59)

    candidate_vn = datetime(target_date.year, target_date.month, target_date.day, hour, minute, rng.randint(0, 55), tzinfo=VN_TZ)
    return _clamp_time(candidate_vn, reference_now)


def _pick_weighted_persona(rng: random.Random) -> str:
    r = rng.random()
    acc = 0.0
    for name, weight in PERSONA_WEIGHTS:
        acc += weight
        if r <= acc:
            return name
    return PERSONA_WEIGHTS[-1][0]


def build_cohort_dataset(
    n_students: int = 300,
    seed: int = 42,
    reference_now: Optional[datetime] = None,
) -> CohortDataset:
    """Build a fully consistent synthetic LMS cohort dataset in memory."""
    if n_students < 1:
        raise ValueError("n_students must be >= 1")

    ref_now = (reference_now or datetime.now(timezone.utc)).astimezone(timezone.utc).replace(microsecond=0)
    rng = random.Random(seed)

    instructors: List[Dict[str, Any]] = []
    for idx, (full_name, email, expertise, exp_years, teach_exp, qual, specs) in enumerate(INSTRUCTORS_SPEC, start=1):
        uid = det_uuid(f"instructor:{idx}")
        created = ref_now - timedelta(days=200 - idx * 10)
        instructors.append({
            "id": uid,
            "full_name": full_name,
            "email": email,
            "created_at": created,
            "expertise": expertise,
            "experience_years": exp_years,
            "teaching_experience": teach_exp,
            "qualification_summary": qual,
            "specialties": specs,
        })

    courses: List[Dict[str, Any]] = []
    sections: List[Dict[str, Any]] = []
    lessons: List[Dict[str, Any]] = []
    lesson_attachments: List[Dict[str, Any]] = []
    quizzes: List[Dict[str, Any]] = []
    quiz_questions: List[Dict[str, Any]] = []
    quiz_options: List[Dict[str, Any]] = []
    assignments: List[Dict[str, Any]] = []

    course_catalog_index: List[Dict[str, Any]] = []

    for c_idx, spec in enumerate(COURSE_SPECS, start=1):
        cid = det_uuid(f"course:{spec.code}")
        inst = instructors[spec.instructor_idx]
        c_created = ref_now - timedelta(days=150 - c_idx * 5)
        c_pub = c_created + timedelta(days=3)
        courses.append({
            "id": cid,
            "instructor_id": inst["id"],
            "instructor_name": inst["full_name"],
            "title": spec.title,
            "slug": spec.slug,
            "tagline": spec.tagline,
            "description": spec.description,
            "level": spec.level,
            "price": spec.price,
            "original_price": spec.original_price,
            "status": "PUBLISHED",
            "created_at": c_created,
            "updated_at": c_created,
            "published_at": c_pub,
        })

        ordered_lessons: List[Dict[str, Any]] = []
        course_quizzes: List[Dict[str, Any]] = []

        for sec_pos, (sec_title, lesson_specs) in enumerate(spec.sections, start=1):
            sec_id = det_uuid(f"section:{spec.code}:S{sec_pos}")
            sections.append({
                "id": sec_id,
                "course_id": cid,
                "title": sec_title,
                "position": sec_pos,
                "created_at": c_created,
                "updated_at": c_created,
            })

            for pos_in_sec, lspec in enumerate(lesson_specs, start=1):
                lid = det_uuid(f"lesson:{spec.code}:L{lspec.offset}")
                l_entry = {
                    "id": lid,
                    "section_id": sec_id,
                    "course_id": cid,
                    "offset": lspec.offset,
                    "title": lspec.title,
                    "slug": f"{spec.slug}-bai-{lspec.offset}",
                    "description": f"Nội dung chi tiết cho bài học {lspec.title}",
                    "content": f"Tài liệu bài giảng chuẩn hóa cho {lspec.title} thuộc khóa {spec.title}." if lspec.lesson_type == "TEXT" else None,
                    "lesson_type": lspec.lesson_type,
                    "position": pos_in_sec,
                    "duration_seconds": lspec.duration_seconds,
                    "is_preview": lspec.offset == 1,
                    "status": "PUBLISHED",
                    "created_at": c_created,
                    "updated_at": c_created,
                    "attachment": None,
                    "quiz": None,
                }

                if lspec.has_attachment:
                    att_id = det_uuid(f"attachment:{spec.code}:L{lspec.offset}:0")
                    content_type = "application/pdf" if lspec.attachment_name.endswith(".pdf") else "application/zip"
                    att_row = {
                        "id": att_id,
                        "lesson_id": lid,
                        "position": 0,
                        "object_key": f"courses/{spec.slug}/resources/{lspec.attachment_name}",
                        "file_name": lspec.attachment_name,
                        "content_type": content_type,
                        "content_length": rng.randint(180_000, 2_400_000),
                        "visible_to_students": True,
                    }
                    lesson_attachments.append(att_row)
                    l_entry["attachment"] = att_row

                if lspec.lesson_type == "QUIZ":
                    qid = det_uuid(f"quiz:{spec.code}:L{lspec.offset}")
                    q_count = lspec.question_count or 10
                    quiz_row = {
                        "id": qid,
                        "lesson_id": lid,
                        "section_id": sec_id,
                        "course_id": cid,
                        "passing_score": 70.00,
                        "questions_per_attempt": q_count,
                        "duration_minutes": max(10, q_count),
                        "created_at": c_created,
                        "questions": [],
                    }
                    for q_pos in range(1, q_count + 1):
                        ques_id = det_uuid(f"quiz_q:{spec.code}:L{lspec.offset}:Q{q_pos}")
                        quiz_questions.append({
                            "id": ques_id,
                            "quiz_id": qid,
                            "prompt": f"Câu hỏi {q_pos} ({lspec.title}): Chọn nhận định chính xác nhất.",
                            "position": q_pos,
                        })
                        opt_ids: List[Tuple[uuid.UUID, bool]] = []
                        for o_pos in range(1, 5):
                            opt_id = det_uuid(f"quiz_opt:{spec.code}:L{lspec.offset}:Q{q_pos}:O{o_pos}")
                            is_corr = o_pos == 1
                            quiz_options.append({
                                "id": opt_id,
                                "question_id": ques_id,
                                "label": f"Phương án {chr(64 + o_pos)}" + (" (Đáp án chuẩn)" if is_corr else ""),
                                "is_correct": is_corr,
                                "position": o_pos,
                            })
                            opt_ids.append((opt_id, is_corr))
                        quiz_row["questions"].append({"id": ques_id, "correct_opt": opt_ids[0][0], "wrong_opts": [o[0] for o in opt_ids[1:]]})

                    quizzes.append({
                        "id": qid,
                        "lesson_id": lid,
                        "passing_score": 70.00,
                        "questions_per_attempt": q_count,
                        "duration_minutes": max(10, q_count),
                        "created_at": c_created,
                    })
                    l_entry["quiz"] = quiz_row
                    course_quizzes.append(quiz_row)

                lessons.append({
                    "id": lid,
                    "section_id": sec_id,
                    "title": l_entry["title"],
                    "slug": l_entry["slug"],
                    "description": l_entry["description"],
                    "content": l_entry["content"],
                    "lesson_type": l_entry["lesson_type"],
                    "position": l_entry["position"],
                    "duration_seconds": l_entry["duration_seconds"],
                    "is_preview": l_entry["is_preview"],
                    "status": "PUBLISHED",
                    "created_at": c_created,
                    "updated_at": c_created,
                })
                ordered_lessons.append(l_entry)

        # Two PUBLISHED assignments per course: Assignment 1 uses 10-point scale, Assignment 2 uses 100-point scale
        a1_id = det_uuid(f"assignment:{spec.code}:A1")
        a2_id = det_uuid(f"assignment:{spec.code}:A2")
        course_assignments = [
            {
                "id": a1_id,
                "course_id": cid,
                "instructor_id": inst["id"],
                "title": f"Bài tập thực hành 1 - {spec.title}",
                "description": "Bài tập vận dụng kiến thức nửa đầu khóa học (chấm theo thang điểm 10).",
                "due_at": ref_now - timedelta(days=20),
                "max_score": 10.00,
                "status": "PUBLISHED",
                "created_at": c_pub,
                "updated_at": c_pub,
                "published_at": c_pub,
            },
            {
                "id": a2_id,
                "course_id": cid,
                "instructor_id": inst["id"],
                "title": f"Dự án tổng hợp cuối khóa - {spec.title}",
                "description": "Bài tập lớn tổng hợp toàn khóa (chấm theo thang điểm 100).",
                "due_at": ref_now - timedelta(days=5),
                "max_score": 100.00,
                "status": "PUBLISHED",
                "created_at": c_pub + timedelta(days=7),
                "updated_at": c_pub + timedelta(days=7),
                "published_at": c_pub + timedelta(days=7),
            },
        ]
        assignments.extend(course_assignments)

        course_catalog_index.append({
            "spec": spec,
            "course": courses[-1],
            "lessons": ordered_lessons,
            "quizzes": course_quizzes,
            "assignments": course_assignments,
        })

    # Generate 300 realistic Vietnamese students
    students: List[Dict[str, Any]] = []
    for s_idx in range(1, n_students + 1):
        sid = det_uuid(f"student:{s_idx:04d}")
        full_name = f"{rng.choice(SURNAMES)} {rng.choice(MIDDLE_NAMES)} {rng.choice(GIVEN_NAMES)}"
        occ, edu = rng.choice(OCCUPATIONS)
        goal = rng.choice(LEARNING_GOALS)
        account_age_days = rng.randint(10, 120)
        created_at = ref_now - timedelta(days=account_age_days, hours=rng.randint(0, 12))
        students.append({
            "id": sid,
            "code": f"STD{s_idx:04d}",
            "full_name": full_name,
            "email": f"cohort.std.{s_idx:04d}{COHORT_STUDENT_DOMAIN}",
            "created_at": created_at,
            "account_age_days": account_age_days,
            "occupation": occ,
            "education_level": edu,
            "learning_goal": goal,
            "base_persona": _pick_weighted_persona(rng),
        })

    enrollments: List[Dict[str, Any]] = []
    learning_progress: List[Dict[str, Any]] = []
    quiz_attempts: List[Dict[str, Any]] = []
    quiz_attempt_sessions: List[Dict[str, Any]] = []
    quiz_attempt_answers: List[Dict[str, Any]] = []
    assignment_submissions: List[Dict[str, Any]] = []
    learning_notes: List[Dict[str, Any]] = []
    discussions: List[Dict[str, Any]] = []
    discussion_comments: List[Dict[str, Any]] = []
    course_reviews: List[Dict[str, Any]] = []
    certificates: List[Dict[str, Any]] = []
    learning_activities: List[Dict[str, Any]] = []
    persona_summary: Dict[str, int] = {name: 0 for name, _ in PERSONA_WEIGHTS}

    def add_activity(
        act_key: str,
        student_id: uuid.UUID,
        course_id: uuid.UUID,
        section_id: Optional[uuid.UUID],
        lesson_id: Optional[uuid.UUID],
        activity_type: str,
        source_id: Optional[uuid.UUID],
        occurred_at: datetime,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        safe_ts = _clamp_time(occurred_at, ref_now)
        learning_activities.append({
            "id": det_uuid(f"activity:{act_key}"),
            "student_id": student_id,
            "course_id": course_id,
            "section_id": section_id,
            "lesson_id": lesson_id,
            "activity_type": activity_type,
            "source_id": source_id,
            "occurred_at": safe_ts,
            "metadata_json": json.dumps(metadata, ensure_ascii=False) if metadata is not None else None,
        })

    for s_idx, student in enumerate(students, start=1):
        # 1 to 3 enrollments per student -> average ~1.85 enrollments (~555 total for 300 students)
        n_courses = rng.choices([1, 2, 3], weights=[0.35, 0.45, 0.20], k=1)[0]
        chosen_courses = rng.sample(course_catalog_index, k=n_courses)

        for e_num, c_bundle in enumerate(chosen_courses, start=1):
            # Primary course uses student's primary persona; extra courses allow natural variation
            persona = student["base_persona"] if e_num == 1 else _pick_weighted_persona(rng)
            persona_summary[persona] += 1

            course = c_bundle["course"]
            c_spec: CourseSpec = c_bundle["spec"]
            c_lessons = c_bundle["lessons"]
            c_assigns = c_bundle["assignments"]

            enroll_key = f"enroll:{student['code']}:{c_spec.code}"
            en_id = det_uuid(enroll_key)

            # Persona-driven timeline boundaries ensuring distinct academic_status outputs
            if persona == "COMPLETED":
                enrolled_days_ago = rng.randint(35, 85)
                last_active_days_ago = rng.randint(1, 14)
                lessons_to_complete = len(c_lessons)
                score_center = rng.uniform(0.84, 0.96)
                is_late_tendency = 0.10
                retake_prob = 0.15
                assign1_prob, assign2_prob = 1.0, 1.0
                ungraded_prob = 0.0
                note_target = rng.randint(2, 5)
                disc_prob = 0.55
            elif persona == "EXCELLING":
                enrolled_days_ago = rng.randint(22, 48)
                last_active_days_ago = rng.randint(0, 4)
                lessons_to_complete = rng.choice([7, 8])
                score_center = rng.uniform(0.85, 0.96)
                is_late_tendency = 0.08
                retake_prob = 0.18
                assign1_prob, assign2_prob = 1.0, 0.90
                ungraded_prob = 0.15
                note_target = rng.randint(3, 5)
                disc_prob = 0.70
            elif persona == "ON_TRACK":
                enrolled_days_ago = rng.randint(16, 45)
                last_active_days_ago = rng.randint(1, 10)
                lessons_to_complete = rng.randint(4, 6)
                score_center = rng.uniform(0.62, 0.80)
                is_late_tendency = 0.25
                retake_prob = 0.35
                assign1_prob, assign2_prob = 0.90, 0.55
                ungraded_prob = 0.18
                note_target = rng.randint(1, 3)
                disc_prob = 0.40
            elif persona == "STRUGGLING":
                enrolled_days_ago = rng.randint(18, 45)
                last_active_days_ago = rng.randint(3, 12)
                lessons_to_complete = rng.randint(2, 4)
                score_center = rng.uniform(0.35, 0.58)
                is_late_tendency = 0.65
                retake_prob = 0.45
                assign1_prob, assign2_prob = 0.75, 0.25
                ungraded_prob = 0.12
                note_target = rng.randint(0, 1)
                disc_prob = 0.25
            elif persona == "AT_RISK_DROPOUT":
                enrolled_days_ago = rng.randint(32, 72)
                last_active_days_ago = rng.randint(17, min(enrolled_days_ago - 2, 42))
                lessons_to_complete = rng.randint(1, 4)
                score_center = rng.uniform(0.28, 0.55)
                is_late_tendency = 0.75
                retake_prob = 0.25
                assign1_prob, assign2_prob = 0.45, 0.05
                ungraded_prob = 0.0
                note_target = 0
                disc_prob = 0.12
            else:  # JUST_STARTED
                enrolled_days_ago = rng.randint(1, 6)
                last_active_days_ago = rng.randint(0, max(0, enrolled_days_ago - 1))
                lessons_to_complete = rng.randint(0, 2)
                score_center = rng.uniform(0.55, 0.75)
                is_late_tendency = 0.0
                retake_prob = 0.0
                assign1_prob, assign2_prob = 0.0, 0.0
                ungraded_prob = 0.0
                note_target = rng.randint(0, 1)
                disc_prob = 0.10

            enrolled_at = _pick_vn_study_timestamp(rng, enrolled_days_ago, ref_now)
            if student["created_at"] > enrolled_at:
                student["created_at"] = enrolled_at - timedelta(days=rng.randint(1, 5))

            enrollments.append({
                "id": en_id,
                "student_id": student["id"],
                "course_id": course["id"],
                "status": "ACTIVE",
                "enrolled_at": enrolled_at,
                "created_at": enrolled_at,
                "updated_at": enrolled_at,
            })

            enroll_meta = (
                {"source": "free_enrollment"}
                if course["price"] == 0
                else {"source": "checkout"}
            )
            add_activity(
                f"{enroll_key}:COURSE_ENROLLED",
                student["id"],
                course["id"],
                None,
                None,
                "COURSE_ENROLLED",
                en_id,
                enrolled_at,
                enroll_meta,
            )

            # Distribute active study days across [enrolled_days_ago, last_active_days_ago]
            span = max(0, enrolled_days_ago - last_active_days_ago)
            active_lesson_count = min(len(c_lessons), lessons_to_complete + (1 if persona == "JUST_STARTED" and lessons_to_complete == 0 else 0))

            last_lesson_completed_at: Optional[datetime] = None

            for idx_les in range(active_lesson_count):
                les = c_lessons[idx_les]
                if active_lesson_count <= 1 or span == 0:
                    days_offset = last_active_days_ago
                else:
                    frac = idx_les / max(1, active_lesson_count - 1)
                    days_offset = int(round(enrolled_days_ago - frac * span))
                    days_offset = max(last_active_days_ago, min(enrolled_days_ago, days_offset))

                study_start = _pick_vn_study_timestamp(rng, days_offset, ref_now)
                if study_start < enrolled_at:
                    study_start = _clamp_time(enrolled_at + timedelta(minutes=rng.randint(5, 45)), ref_now)

                # 1. Open LESSON_VIEWED
                add_activity(
                    f"{enroll_key}:L{les['offset']}:VIEW",
                    student["id"],
                    course["id"],
                    les["section_id"],
                    les["id"],
                    "LESSON_VIEWED",
                    None,
                    study_start,
                    {"lesson_type": les["lesson_type"]},
                )

                # 2. Content consumption telemetry
                activity_end = study_start + timedelta(minutes=2)
                if les["lesson_type"] == "VIDEO":
                    watched_ratio = rng.uniform(0.75, 1.0) if idx_les < lessons_to_complete else rng.uniform(0.25, 0.6)
                    total_watch = max(60, int(round(les["duration_seconds"] * watched_ratio)))
                    part1 = max(30, total_watch // 2)
                    part2 = max(0, total_watch - part1)
                    add_activity(
                        f"{enroll_key}:L{les['offset']}:VID1",
                        student["id"],
                        course["id"],
                        les["section_id"],
                        les["id"],
                        "VIDEO_WATCHED",
                        None,
                        study_start + timedelta(seconds=part1),
                        {"duration_seconds": part1, "position_seconds": part1},
                    )
                    if part2 > 0 and idx_les < lessons_to_complete:
                        add_activity(
                            f"{enroll_key}:L{les['offset']}:VID2",
                            student["id"],
                            course["id"],
                            les["section_id"],
                            les["id"],
                            "VIDEO_WATCHED",
                            None,
                            study_start + timedelta(seconds=part1 + part2),
                            {"duration_seconds": part2, "position_seconds": part1 + part2},
                        )
                    activity_end = _clamp_time(study_start + timedelta(seconds=total_watch + 20), ref_now)

                elif les["lesson_type"] == "TEXT":
                    read_ratio = rng.uniform(0.6, 1.0) if idx_les < lessons_to_complete else rng.uniform(0.2, 0.5)
                    read_secs = max(45, int(round(les["duration_seconds"] * read_ratio)))
                    activity_end = _clamp_time(study_start + timedelta(seconds=read_secs), ref_now)
                    add_activity(
                        f"{enroll_key}:L{les['offset']}:READ",
                        student["id"],
                        course["id"],
                        les["section_id"],
                        les["id"],
                        "LESSON_VIEWED",
                        None,
                        activity_end,
                        {"lesson_type": "TEXT", "reading_time_seconds": read_secs},
                    )

                elif les["lesson_type"] == "QUIZ" and les["quiz"] is not None:
                    q_meta = les["quiz"]
                    # Allow JUST_STARTED students who reached L4 or higher personas to attempt quiz
                    n_attempts = 2 if (rng.random() < retake_prob and idx_les < lessons_to_complete) else 1
                    best_passed = False
                    latest_submit = study_start + timedelta(minutes=4)

                    for att_no in range(1, n_attempts + 1):
                        att_id = det_uuid(f"{enroll_key}:QUIZ:{q_meta['id']}:A{att_no}")
                        ses_id = det_uuid(f"{enroll_key}:QSES:{q_meta['id']}:A{att_no}")
                        dur_secs = rng.randint(180, max(240, q_meta["duration_minutes"] * 55))
                        started_at = _clamp_time(
                            study_start + timedelta(minutes=(att_no - 1) * 18),
                            ref_now - timedelta(minutes=2),
                        )
                        submitted_at = _clamp_time(started_at + timedelta(seconds=dur_secs), ref_now)
                        if submitted_at <= started_at:
                            started_at = max(enrolled_at, submitted_at - timedelta(seconds=120))

                        q_total = len(q_meta["questions"])
                        # First attempt on a retake starts lower so best_score semantic dedup works meaningfully
                        effective_ratio = score_center * rng.uniform(0.65, 0.88) if (n_attempts > 1 and att_no == 1) else score_center + rng.uniform(-0.08, 0.08)
                        effective_ratio = max(0.10, min(1.0, effective_ratio))
                        corr_count = max(0, min(q_total, int(round(effective_ratio * q_total))))
                        score = round((corr_count / q_total) * 100.0, 2)
                        passed = score >= float(q_meta["passing_score"])
                        best_passed = best_passed or passed

                        quiz_attempts.append({
                            "id": att_id,
                            "quiz_id": q_meta["id"],
                            "student_id": student["id"],
                            "score": score,
                            "correct_answers": corr_count,
                            "total_questions": q_total,
                            "passed": passed,
                            "submitted_at": submitted_at,
                        })
                        quiz_attempt_sessions.append({
                            "id": ses_id,
                            "quiz_id": q_meta["id"],
                            "student_id": student["id"],
                            "status": "SUBMITTED",
                            "started_at": started_at,
                            "expires_at": started_at + timedelta(minutes=q_meta["duration_minutes"]),
                            "attempt_id": att_id,
                            "created_at": started_at,
                            "updated_at": submitted_at,
                        })

                        # Record per-question answers
                        chosen_correct_indices = set(rng.sample(range(q_total), k=corr_count))
                        for q_i, ques in enumerate(q_meta["questions"]):
                            is_c = q_i in chosen_correct_indices
                            sel_opt = ques["correct_opt"] if is_c else rng.choice(ques["wrong_opts"])
                            quiz_attempt_answers.append({
                                "id": det_uuid(f"{enroll_key}:QUIZ_ANS:{q_meta['id']}:A{att_no}:Q{q_i}"),
                                "attempt_id": att_id,
                                "question_id": ques["id"],
                                "selected_option_id": sel_opt,
                                "is_correct": is_c,
                            })

                        add_activity(
                            f"{enroll_key}:QUIZ:{q_meta['id']}:START:{att_no}",
                            student["id"],
                            course["id"],
                            les["section_id"],
                            les["id"],
                            "QUIZ_STARTED",
                            ses_id,
                            started_at,
                            {"quizId": str(q_meta["id"]), "questionCount": q_total, "durationMinutes": q_meta["duration_minutes"]},
                        )
                        add_activity(
                            f"{enroll_key}:QUIZ:{q_meta['id']}:SUB:{att_no}",
                            student["id"],
                            course["id"],
                            les["section_id"],
                            les["id"],
                            "QUIZ_SUBMITTED",
                            att_id,
                            submitted_at,
                            {
                                "score": score,
                                "passed": passed,
                                "correctCount": corr_count,
                                "totalCount": q_total,
                                "durationSeconds": dur_secs,
                            },
                        )
                        latest_submit = submitted_at

                    activity_end = latest_submit

                # 3. Resource download event if lesson has an attachment
                if les["attachment"] is not None and rng.random() < (0.85 if persona in ("COMPLETED", "EXCELLING") else 0.45):
                    dl_ts = _clamp_time(study_start + timedelta(minutes=1), ref_now)
                    add_activity(
                        f"{enroll_key}:L{les['offset']}:DL",
                        student["id"],
                        course["id"],
                        les["section_id"],
                        les["id"],
                        "RESOURCE_DOWNLOADED",
                        None,
                        dl_ts,
                        {"attachment_id": str(les["attachment"]["id"]), "file_name": les["attachment"]["file_name"]},
                    )

                # 4. Learning progress completion
                if idx_les < lessons_to_complete:
                    lp_id = det_uuid(f"{enroll_key}:LP:L{les['offset']}")
                    comp_at = _clamp_time(activity_end + timedelta(seconds=10), ref_now)
                    learning_progress.append({
                        "id": lp_id,
                        "enrollment_id": en_id,
                        "course_id": course["id"],
                        "section_id": les["section_id"],
                        "lesson_id": les["id"],
                        "completed_at": comp_at,
                        "created_at": comp_at,
                        "updated_at": comp_at,
                    })
                    last_lesson_completed_at = comp_at if (last_lesson_completed_at is None or comp_at > last_lesson_completed_at) else last_lesson_completed_at
                    add_activity(
                        f"{enroll_key}:L{les['offset']}:COMPLETE",
                        student["id"],
                        course["id"],
                        les["section_id"],
                        les["id"],
                        "LESSON_COMPLETED",
                        lp_id,
                        comp_at,
                        {"duration_seconds": les["duration_seconds"]} if les["duration_seconds"] > 0 else None,
                    )

            # Assignment submissions (A1 and A2)
            for a_idx, asn in enumerate(c_assigns, start=1):
                sub_prob = assign1_prob if a_idx == 1 else assign2_prob
                if rng.random() > sub_prob:
                    continue
                due_at: datetime = asn["due_at"]
                is_late = rng.random() < is_late_tendency

                if is_late:
                    sub_ts = due_at + timedelta(days=rng.randint(1, 5), hours=rng.randint(1, 10))
                else:
                    sub_ts = due_at - timedelta(days=rng.randint(1, 6), hours=rng.randint(1, 10))

                # Keep submission between enrollment and reference_now
                if sub_ts < enrolled_at + timedelta(hours=4):
                    sub_ts = _pick_vn_study_timestamp(rng, max(0, last_active_days_ago), ref_now)
                if persona == "AT_RISK_DROPOUT":
                    earliest_dropout_floor = ref_now - timedelta(days=last_active_days_ago)
                    if sub_ts > earliest_dropout_floor:
                        sub_ts = earliest_dropout_floor - timedelta(hours=rng.randint(1, 12))
                sub_ts = _clamp_time(max(enrolled_at + timedelta(minutes=15), sub_ts), ref_now - timedelta(minutes=1))

                sub_id = det_uuid(f"{enroll_key}:ASUB:{a_idx}")
                is_ungraded = (persona != "COMPLETED" and persona != "AT_RISK_DROPOUT" and rng.random() < ungraded_prob)
                if is_ungraded:
                    score_val: Optional[float] = None
                    graded_by: Optional[uuid.UUID] = None
                    graded_at: Optional[datetime] = None
                    feedback: Optional[str] = None
                else:
                    max_s = float(asn["max_score"])
                    ratio = max(0.15, min(1.0, score_center + rng.uniform(-0.10, 0.08)))
                    score_val = round(ratio * max_s, 1 if max_s <= 10.0 else 2)
                    graded_by = course["instructor_id"]
                    graded_at = _clamp_time(sub_ts + timedelta(hours=rng.randint(4, 36)), ref_now)
                    if persona == "AT_RISK_DROPOUT":
                        graded_at = _clamp_time(sub_ts + timedelta(hours=4), ref_now - timedelta(days=last_active_days_ago))
                    feedback = (
                        "Bài làm tốt, trình bày mạch lạc và đáp ứng đầy đủ yêu cầu đề bài."
                        if ratio >= 0.75
                        else "Cần bổ sung phần giải thích chi tiết và kiểm tra kỹ trường hợp biên."
                    )

                assignment_submissions.append({
                    "id": sub_id,
                    "assignment_id": asn["id"],
                    "student_id": student["id"],
                    "response_text": f"Bài nộp của học viên {student['full_name']} cho {asn['title']}. Đã hoàn thiện mã nguồn và tài liệu báo cáo.",
                    "submitted_at": sub_ts,
                    "score": score_val,
                    "feedback": feedback,
                    "graded_by": graded_by,
                    "graded_at": graded_at,
                    "created_at": sub_ts,
                    "updated_at": graded_at or sub_ts,
                })
                add_activity(
                    f"{enroll_key}:ASUB:{a_idx}:SUBMITTED",
                    student["id"],
                    course["id"],
                    None,
                    None,
                    "ASSIGNMENT_SUBMITTED",
                    sub_id,
                    sub_ts,
                    None,
                )
                if score_val is not None and graded_at is not None:
                    add_activity(
                        f"{enroll_key}:ASUB:{a_idx}:GRADED",
                        student["id"],
                        course["id"],
                        None,
                        None,
                        "ASSIGNMENT_GRADED",
                        sub_id,
                        graded_at,
                        {"score": score_val, "maxScore": float(asn["max_score"])},
                    )

            # Personal learning notes
            eligible_lessons = c_lessons[: max(1, active_lesson_count)]
            for n_i in range(1, note_target + 1):
                les = rng.choice(eligible_lessons)
                note_id = det_uuid(f"{enroll_key}:NOTE:{n_i}")
                note_ts = _pick_vn_study_timestamp(rng, rng.randint(last_active_days_ago, enrolled_days_ago), ref_now)
                if note_ts < enrolled_at:
                    note_ts = _clamp_time(enrolled_at + timedelta(minutes=30), ref_now)
                vsec = rng.randint(35, max(60, les["duration_seconds"] - 30)) if les["lesson_type"] == "VIDEO" else None
                learning_notes.append({
                    "id": note_id,
                    "user_id": student["id"],
                    "lesson_id": les["id"],
                    "title": rng.choice(NOTE_TITLES),
                    "content": rng.choice(NOTE_BODIES),
                    "video_second": vsec,
                    "created_at": note_ts,
                    "updated_at": note_ts,
                })
                add_activity(
                    f"{enroll_key}:NOTE:{n_i}",
                    student["id"],
                    course["id"],
                    les["section_id"],
                    les["id"],
                    "NOTE_CREATED",
                    note_id,
                    note_ts,
                    {"videoSecond": vsec} if vsec is not None else None,
                )

            # Discussions + student comments + instructor replies
            if rng.random() < disc_prob:
                les = rng.choice(eligible_lessons)
                disc_id = det_uuid(f"{enroll_key}:DISC:1")
                disc_ts = _pick_vn_study_timestamp(rng, rng.randint(last_active_days_ago, enrolled_days_ago), ref_now)
                if disc_ts < enrolled_at:
                    disc_ts = _clamp_time(enrolled_at + timedelta(minutes=40), ref_now)
                q_title_tpl, q_body_tpl = rng.choice(QUESTION_TEMPLATES)
                v_ts = rng.randint(45, max(80, les["duration_seconds"] - 20)) if les["lesson_type"] == "VIDEO" else None
                is_resolved = rng.random() < 0.55

                discussions.append({
                    "id": disc_id,
                    "course_id": course["id"],
                    "lesson_id": les["id"],
                    "author_id": student["id"],
                    "title": q_title_tpl.format(lesson_title=les["title"])[:200],
                    "body": q_body_tpl.format(lesson_title=les["title"]),
                    "video_timestamp_seconds": v_ts,
                    "status": "RESOLVED" if is_resolved else "OPEN",
                    "created_at": disc_ts,
                    "updated_at": disc_ts,
                })
                add_activity(
                    f"{enroll_key}:DISC:1",
                    student["id"],
                    course["id"],
                    les["section_id"],
                    les["id"],
                    "QUESTION_ASKED",
                    disc_id,
                    disc_ts,
                    {"videoTimestampSeconds": v_ts} if v_ts is not None else None,
                )

                # Student follow-up comment (emits COMMENT_POSTED)
                if rng.random() < 0.65:
                    comm_id = det_uuid(f"{enroll_key}:DCOMM:S1")
                    comm_ts = _clamp_time(disc_ts + timedelta(hours=rng.randint(1, 10)), ref_now)
                    discussion_comments.append({
                        "id": comm_id,
                        "discussion_id": disc_id,
                        "author_id": student["id"],
                        "parent_comment_id": None,
                        "body": rng.choice(STUDENT_COMMENT_TEMPLATES),
                        "created_at": comm_ts,
                        "updated_at": comm_ts,
                    })
                    add_activity(
                        f"{enroll_key}:DCOMM:S1",
                        student["id"],
                        course["id"],
                        les["section_id"],
                        les["id"],
                        "COMMENT_POSTED",
                        comm_id,
                        comm_ts,
                        {"discussionId": str(disc_id)},
                    )

                # Instructor reply (must NOT insert into student learning_activities)
                if is_resolved:
                    inst_comm_id = det_uuid(f"{enroll_key}:DCOMM:INST1")
                    inst_ts = _clamp_time(disc_ts + timedelta(hours=rng.randint(2, 18)), ref_now)
                    discussion_comments.append({
                        "id": inst_comm_id,
                        "discussion_id": disc_id,
                        "author_id": course["instructor_id"],
                        "parent_comment_id": None,
                        "body": rng.choice(INSTRUCTOR_REPLY_TEMPLATES),
                        "created_at": inst_ts,
                        "updated_at": inst_ts,
                    })

            # Course completion + Certificate + Course Review
            if lessons_to_complete >= len(c_lessons) and last_lesson_completed_at is not None:
                add_activity(
                    f"{enroll_key}:COURSE_COMPLETED",
                    student["id"],
                    course["id"],
                    None,
                    None,
                    "COURSE_COMPLETED",
                    None,
                    last_lesson_completed_at,
                    {"source": "lesson_completion"},
                )
                cert_id = det_uuid(f"{enroll_key}:CERT")
                cert_num = f"EA-COHORT-{c_spec.code}-{s_idx:04d}"
                issued_at = _clamp_time(last_lesson_completed_at + timedelta(seconds=30), ref_now)
                certificates.append({
                    "id": cert_id,
                    "student_id": student["id"],
                    "course_id": course["id"],
                    "enrollment_id": en_id,
                    "certificate_number": cert_num,
                    "student_name": student["full_name"],
                    "course_title": course["title"],
                    "instructor_name": course["instructor_name"],
                    "issued_at": issued_at,
                    "created_at": issued_at,
                })
                add_activity(
                    f"{enroll_key}:CERT_ISSUED",
                    student["id"],
                    course["id"],
                    None,
                    None,
                    "CERTIFICATE_ISSUED",
                    cert_id,
                    issued_at,
                    {"certificateNumber": cert_num},
                )

                if rng.random() < 0.72:
                    rev_ts = _clamp_time(issued_at + timedelta(hours=rng.randint(1, 24)), ref_now)
                    rating = rng.choices([5, 4, 3], weights=[0.65, 0.30, 0.05], k=1)[0]
                    comment = rng.choice(POSITIVE_REVIEWS if rating >= 4 else NEUTRAL_REVIEWS)
                    course_reviews.append({
                        "id": det_uuid(f"{enroll_key}:REVIEW"),
                        "student_id": student["id"],
                        "course_id": course["id"],
                        "rating": rating,
                        "comment": comment,
                        "status": "PUBLISHED",
                        "created_at": rev_ts,
                        "updated_at": rev_ts,
                    })
            elif persona in ("EXCELLING", "ON_TRACK") and rng.random() < 0.25:
                rev_ts = _pick_vn_study_timestamp(rng, last_active_days_ago, ref_now)
                rating = rng.choices([5, 4, 3], weights=[0.45, 0.45, 0.10], k=1)[0]
                comment = rng.choice(POSITIVE_REVIEWS if rating >= 4 else NEUTRAL_REVIEWS)
                course_reviews.append({
                    "id": det_uuid(f"{enroll_key}:REVIEW"),
                    "student_id": student["id"],
                    "course_id": course["id"],
                    "rating": rating,
                    "comment": comment,
                    "status": "PUBLISHED",
                    "created_at": rev_ts,
                    "updated_at": rev_ts,
                })

    return CohortDataset(
        reference_now=ref_now,
        seed=seed,
        student_count=n_students,
        instructors=instructors,
        students=students,
        courses=courses,
        sections=sections,
        lessons=lessons,
        lesson_attachments=lesson_attachments,
        quizzes=quizzes,
        quiz_questions=quiz_questions,
        quiz_options=quiz_options,
        assignments=assignments,
        enrollments=enrollments,
        learning_progress=learning_progress,
        quiz_attempts=quiz_attempts,
        quiz_attempt_sessions=quiz_attempt_sessions,
        quiz_attempt_answers=quiz_attempt_answers,
        assignment_submissions=assignment_submissions,
        learning_notes=learning_notes,
        discussions=discussions,
        discussion_comments=discussion_comments,
        course_reviews=course_reviews,
        certificates=certificates,
        learning_activities=learning_activities,
        persona_summary=persona_summary,
    )


def validate_target_host(db_config: DatabaseConfig, allow_remote: bool = False) -> None:
    """Prevent accidental writes to remote/production databases."""
    if not allow_remote and db_config.host not in LOCAL_DB_HOSTS:
        raise ValueError(
            f"Refusing to seed non-local database host '{db_config.host}'. Pass --allow-remote only for disposable targets."
        )


def _fetch_role_ids(cur: Any) -> Dict[str, uuid.UUID]:
    cur.execute("SELECT id, name FROM roles WHERE name IN ('INSTRUCTOR', 'STUDENT')")
    roles = {row[1]: uuid.UUID(str(row[0])) for row in cur.fetchall()}
    missing = {"INSTRUCTOR", "STUDENT"} - set(roles.keys())
    if missing:
        raise RuntimeError(f"Missing required roles in database: {sorted(missing)}. Apply Flyway migrations first.")
    return roles


def reset_cohort_in_db(cur: Any) -> None:
    """Safely remove ONLY cohort-owned courses and users without touching manual dev records."""
    logger.info("Resetting existing synthetic cohort records...")
    cohort_course_filter = "slug LIKE %s"
    cohort_user_filter = "(email LIKE %s OR email LIKE %s)"
    slug_pat = f"{COHORT_SLUG_PREFIX}%"
    std_pat = f"%{COHORT_STUDENT_DOMAIN}"
    inst_pat = f"%{COHORT_INSTRUCTOR_DOMAIN}"

    cur.execute(
        f"""
        WITH target_courses AS (SELECT id FROM courses WHERE {cohort_course_filter}),
             target_users AS (SELECT id FROM users WHERE {cohort_user_filter})
        DELETE FROM learning_activities
        WHERE course_id IN (SELECT id FROM target_courses)
           OR student_id IN (SELECT id FROM target_users)
        """,
        (slug_pat, std_pat, inst_pat),
    )
    cur.execute(
        f"""
        WITH target_courses AS (SELECT id FROM courses WHERE {cohort_course_filter}),
             target_users AS (SELECT id FROM users WHERE {cohort_user_filter})
        DELETE FROM discussion_comments
        WHERE author_id IN (SELECT id FROM target_users)
           OR discussion_id IN (SELECT id FROM discussions WHERE course_id IN (SELECT id FROM target_courses))
        """,
        (slug_pat, std_pat, inst_pat),
    )
    cur.execute(
        f"DELETE FROM discussions WHERE course_id IN (SELECT id FROM courses WHERE {cohort_course_filter}) OR author_id IN (SELECT id FROM users WHERE {cohort_user_filter})",
        (slug_pat, std_pat, inst_pat),
    )
    cur.execute(
        f"DELETE FROM learning_notes WHERE user_id IN (SELECT id FROM users WHERE {cohort_user_filter})",
        (std_pat, inst_pat),
    )
    cur.execute(
        f"DELETE FROM certificates WHERE course_id IN (SELECT id FROM courses WHERE {cohort_course_filter}) OR student_id IN (SELECT id FROM users WHERE {cohort_user_filter})",
        (slug_pat, std_pat, inst_pat),
    )
    cur.execute(
        f"DELETE FROM course_reviews WHERE course_id IN (SELECT id FROM courses WHERE {cohort_course_filter}) OR student_id IN (SELECT id FROM users WHERE {cohort_user_filter})",
        (slug_pat, std_pat, inst_pat),
    )
    cur.execute(
        f"DELETE FROM assignment_submissions WHERE student_id IN (SELECT id FROM users WHERE {cohort_user_filter}) OR assignment_id IN (SELECT id FROM assignments WHERE course_id IN (SELECT id FROM courses WHERE {cohort_course_filter}))",
        (std_pat, inst_pat, slug_pat),
    )
    cur.execute(
        f"DELETE FROM quiz_attempt_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE student_id IN (SELECT id FROM users WHERE {cohort_user_filter}))",
        (std_pat, inst_pat),
    )
    cur.execute(
        f"DELETE FROM quiz_attempt_sessions WHERE student_id IN (SELECT id FROM users WHERE {cohort_user_filter})",
        (std_pat, inst_pat),
    )
    cur.execute(
        f"DELETE FROM quiz_attempts WHERE student_id IN (SELECT id FROM users WHERE {cohort_user_filter})",
        (std_pat, inst_pat),
    )
    cur.execute(
        f"DELETE FROM learning_progress WHERE course_id IN (SELECT id FROM courses WHERE {cohort_course_filter}) OR enrollment_id IN (SELECT id FROM enrollments WHERE student_id IN (SELECT id FROM users WHERE {cohort_user_filter}))",
        (slug_pat, std_pat, inst_pat),
    )
    cur.execute(
        f"DELETE FROM enrollments WHERE course_id IN (SELECT id FROM courses WHERE {cohort_course_filter}) OR student_id IN (SELECT id FROM users WHERE {cohort_user_filter})",
        (slug_pat, std_pat, inst_pat),
    )
    cur.execute(f"DELETE FROM assignments WHERE course_id IN (SELECT id FROM courses WHERE {cohort_course_filter})", (slug_pat,))
    cur.execute(
        f"DELETE FROM quizzes WHERE lesson_id IN (SELECT l.id FROM lessons l JOIN sections s ON l.section_id = s.id JOIN courses c ON s.course_id = c.id WHERE c.{cohort_course_filter})",
        (slug_pat,),
    )
    cur.execute(
        f"DELETE FROM lesson_attachments WHERE lesson_id IN (SELECT l.id FROM lessons l JOIN sections s ON l.section_id = s.id JOIN courses c ON s.course_id = c.id WHERE c.{cohort_course_filter})",
        (slug_pat,),
    )
    cur.execute(
        f"DELETE FROM lessons WHERE section_id IN (SELECT s.id FROM sections s JOIN courses c ON s.course_id = c.id WHERE c.{cohort_course_filter})",
        (slug_pat,),
    )
    cur.execute(f"DELETE FROM sections WHERE course_id IN (SELECT id FROM courses WHERE {cohort_course_filter})", (slug_pat,))
    cur.execute(f"DELETE FROM courses WHERE {cohort_course_filter}", (slug_pat,))
    cur.execute(f"DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE {cohort_user_filter})", (std_pat, inst_pat))
    cur.execute(f"DELETE FROM student_profiles WHERE user_id IN (SELECT id FROM users WHERE {cohort_user_filter})", (std_pat, inst_pat))
    cur.execute(f"DELETE FROM instructor_profiles WHERE user_id IN (SELECT id FROM users WHERE {cohort_user_filter})", (std_pat, inst_pat))
    cur.execute(f"DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE {cohort_user_filter})", (std_pat, inst_pat))
    cur.execute(f"DELETE FROM users WHERE {cohort_user_filter}", (std_pat, inst_pat))


def apply_cohort_to_db(db_config: DatabaseConfig, dataset: CohortDataset, reset: bool = False) -> Dict[str, int]:
    """Persist the generated cohort dataset idempotently inside a single PostgreSQL transaction."""
    dsn = db_config.get_dsn_dict()
    conn = psycopg2.connect(**dsn)
    psycopg2.extras.register_uuid()

    try:
        with conn:
            with conn.cursor() as cur:
                if reset:
                    reset_cohort_in_db(cur)

                roles = _fetch_role_ids(cur)
                instructor_role_id = roles["INSTRUCTOR"]
                student_role_id = roles["STUDENT"]
                now_ts = dataset.reference_now

                # 1. Instructors & Students in users/profiles/user_roles
                all_users_rows = [
                    (
                        u["id"],
                        u["full_name"],
                        u["email"],
                        DEMO_PASSWORD_HASH,
                        "ACTIVE",
                        u["created_at"],
                        u["created_at"],
                        now_ts,
                    )
                    for u in (*dataset.instructors, *dataset.students)
                ]
                execute_values(
                    cur,
                    """
                    INSERT INTO users (id, full_name, email, password_hash, status, email_verified_at, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    all_users_rows,
                    page_size=500,
                )

                role_rows = [(u["id"], instructor_role_id) for u in dataset.instructors] + [
                    (u["id"], student_role_id) for u in dataset.students
                ]
                execute_values(
                    cur,
                    "INSERT INTO user_roles (user_id, role_id) VALUES %s ON CONFLICT DO NOTHING",
                    role_rows,
                    page_size=500,
                )

                profile_rows = [
                    (
                        inst["id"],
                        inst["expertise"],
                        inst["teaching_experience"],
                        "vi",
                        inst["created_at"],
                        now_ts,
                    )
                    for inst in dataset.instructors
                ] + [
                    (
                        st["id"],
                        st["occupation"],
                        st["learning_goal"],
                        "vi",
                        st["created_at"],
                        now_ts,
                    )
                    for st in dataset.students
                ]
                execute_values(
                    cur,
                    """
                    INSERT INTO profiles (user_id, headline, bio, language, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    profile_rows,
                    page_size=500,
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO instructor_profiles (user_id, expertise, experience_years, teaching_experience, qualification_summary, specialties, verified_at, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (
                            i["id"], i["expertise"], i["experience_years"], i["teaching_experience"],
                            i["qualification_summary"], i["specialties"], i["created_at"], i["created_at"], now_ts,
                        )
                        for i in dataset.instructors
                    ],
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO student_profiles (user_id, learning_goal, occupation, education_level, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (s["id"], s["learning_goal"], s["occupation"], s["education_level"], s["created_at"], now_ts)
                        for s in dataset.students
                    ],
                    page_size=500,
                )

                # 2. Courses, Sections, Lessons, Attachments, Quizzes, Assignments
                execute_values(
                    cur,
                    """
                    INSERT INTO courses (id, instructor_id, title, slug, tagline, description, price, original_price, level, language, status, created_at, updated_at, published_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (
                            c["id"], c["instructor_id"], c["title"], c["slug"], c["tagline"], c["description"],
                            c["price"], c["original_price"], c["level"], "vi", c["status"],
                            c["created_at"], c["updated_at"], c["published_at"],
                        )
                        for c in dataset.courses
                    ],
                )

                execute_values(
                    cur,
                    "INSERT INTO sections (id, course_id, title, position, created_at, updated_at) VALUES %s ON CONFLICT DO NOTHING",
                    [(s["id"], s["course_id"], s["title"], s["position"], s["created_at"], s["updated_at"]) for s in dataset.sections],
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO lessons (id, section_id, title, slug, description, content, lesson_type, position, duration_seconds, is_preview, status, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (
                            l["id"], l["section_id"], l["title"], l["slug"], l["description"], l["content"],
                            l["lesson_type"], l["position"], l["duration_seconds"], l["is_preview"], l["status"],
                            l["created_at"], l["updated_at"],
                        )
                        for l in dataset.lessons
                    ],
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO lesson_attachments (lesson_id, position, id, object_key, file_name, content_type, content_length, visible_to_students)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (
                            a["lesson_id"], a["position"], a["id"], a["object_key"], a["file_name"],
                            a["content_type"], a["content_length"], a["visible_to_students"],
                        )
                        for a in dataset.lesson_attachments
                    ],
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO quizzes (id, lesson_id, passing_score, questions_per_attempt, duration_minutes, created_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (q["id"], q["lesson_id"], q["passing_score"], q["questions_per_attempt"], q["duration_minutes"], q["created_at"])
                        for q in dataset.quizzes
                    ],
                )

                execute_values(
                    cur,
                    "INSERT INTO quiz_questions (id, quiz_id, prompt, position) VALUES %s ON CONFLICT DO NOTHING",
                    [(qq["id"], qq["quiz_id"], qq["prompt"], qq["position"]) for qq in dataset.quiz_questions],
                    page_size=500,
                )

                execute_values(
                    cur,
                    "INSERT INTO quiz_options (id, question_id, label, is_correct, position) VALUES %s ON CONFLICT DO NOTHING",
                    [(qo["id"], qo["question_id"], qo["label"], qo["is_correct"], qo["position"]) for qo in dataset.quiz_options],
                    page_size=1000,
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO assignments (id, course_id, instructor_id, title, description, due_at, max_score, status, created_at, updated_at, published_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (
                            a["id"], a["course_id"], a["instructor_id"], a["title"], a["description"],
                            a["due_at"], a["max_score"], a["status"], a["created_at"], a["updated_at"], a["published_at"],
                        )
                        for a in dataset.assignments
                    ],
                )

                # 3. Enrollments & Learning Progress
                execute_values(
                    cur,
                    """
                    INSERT INTO enrollments (id, student_id, course_id, status, enrolled_at, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (e["id"], e["student_id"], e["course_id"], e["status"], e["enrolled_at"], e["created_at"], e["updated_at"])
                        for e in dataset.enrollments
                    ],
                    page_size=500,
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO learning_progress (id, enrollment_id, course_id, section_id, lesson_id, completed_at, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (p["id"], p["enrollment_id"], p["course_id"], p["section_id"], p["lesson_id"], p["completed_at"], p["created_at"], p["updated_at"])
                        for p in dataset.learning_progress
                    ],
                    page_size=1000,
                )

                # 4. Assessments
                execute_values(
                    cur,
                    """
                    INSERT INTO quiz_attempts (id, quiz_id, student_id, score, correct_answers, total_questions, passed, submitted_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (qa["id"], qa["quiz_id"], qa["student_id"], qa["score"], qa["correct_answers"], qa["total_questions"], qa["passed"], qa["submitted_at"])
                        for qa in dataset.quiz_attempts
                    ],
                    page_size=500,
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO quiz_attempt_sessions (id, quiz_id, student_id, status, started_at, expires_at, attempt_id, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (qs["id"], qs["quiz_id"], qs["student_id"], qs["status"], qs["started_at"], qs["expires_at"], qs["attempt_id"], qs["created_at"], qs["updated_at"])
                        for qs in dataset.quiz_attempt_sessions
                    ],
                    page_size=500,
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO quiz_attempt_answers (id, attempt_id, question_id, selected_option_id, is_correct)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (ans["id"], ans["attempt_id"], ans["question_id"], ans["selected_option_id"], ans["is_correct"])
                        for ans in dataset.quiz_attempt_answers
                    ],
                    page_size=2000,
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO assignment_submissions (id, assignment_id, student_id, response_text, submitted_at, score, feedback, graded_by, graded_at, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (
                            sub["id"], sub["assignment_id"], sub["student_id"], sub["response_text"], sub["submitted_at"],
                            sub["score"], sub["feedback"], sub["graded_by"], sub["graded_at"], sub["created_at"], sub["updated_at"],
                        )
                        for sub in dataset.assignment_submissions
                    ],
                    page_size=500,
                )

                # 5. Notes, Discussions, Reviews, Certificates
                execute_values(
                    cur,
                    """
                    INSERT INTO learning_notes (id, user_id, lesson_id, title, content, video_second, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (n["id"], n["user_id"], n["lesson_id"], n["title"], n["content"], n["video_second"], n["created_at"], n["updated_at"])
                        for n in dataset.learning_notes
                    ],
                    page_size=500,
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO discussions (id, course_id, lesson_id, author_id, title, body, video_timestamp_seconds, status, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (d["id"], d["course_id"], d["lesson_id"], d["author_id"], d["title"], d["body"], d["video_timestamp_seconds"], d["status"], d["created_at"], d["updated_at"])
                        for d in dataset.discussions
                    ],
                    page_size=500,
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO discussion_comments (id, discussion_id, author_id, parent_comment_id, body, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (dc["id"], dc["discussion_id"], dc["author_id"], dc["parent_comment_id"], dc["body"], dc["created_at"], dc["updated_at"])
                        for dc in dataset.discussion_comments
                    ],
                    page_size=500,
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO course_reviews (id, student_id, course_id, rating, comment, status, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (r["id"], r["student_id"], r["course_id"], r["rating"], r["comment"], r["status"], r["created_at"], r["updated_at"])
                        for r in dataset.course_reviews
                    ],
                    page_size=500,
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO certificates (id, student_id, course_id, enrollment_id, certificate_number, student_name, course_title, instructor_name, issued_at, created_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (c["id"], c["student_id"], c["course_id"], c["enrollment_id"], c["certificate_number"], c["student_name"], c["course_title"], c["instructor_name"], c["issued_at"], c["created_at"])
                        for c in dataset.certificates
                    ],
                    page_size=500,
                )

                # 6. Standardized V34 Learning Activities Telemetry
                execute_values(
                    cur,
                    """
                    INSERT INTO learning_activities (id, student_id, course_id, section_id, lesson_id, activity_type, source_id, occurred_at, metadata, created_at, updated_at)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (
                            a["id"], a["student_id"], a["course_id"], a["section_id"], a["lesson_id"],
                            a["activity_type"], a["source_id"], a["occurred_at"], a["metadata_json"],
                            a["occurred_at"], a["occurred_at"],
                        )
                        for a in dataset.learning_activities
                    ],
                    template="(%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)",
                    page_size=1000,
                )

                cur.execute(
                    """
                    SELECT
                        (SELECT COUNT(*) FROM users WHERE email LIKE %s),
                        (SELECT COUNT(*) FROM courses WHERE slug LIKE %s),
                        (SELECT COUNT(*) FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE c.slug LIKE %s),
                        (SELECT COUNT(*) FROM learning_activities la JOIN courses c ON c.id = la.course_id WHERE c.slug LIKE %s)
                    """,
                    (f"%{COHORT_STUDENT_DOMAIN}", f"{COHORT_SLUG_PREFIX}%", f"{COHORT_SLUG_PREFIX}%", f"{COHORT_SLUG_PREFIX}%"),
                )
                counts = cur.fetchone()
                return {
                    "cohort_students_in_db": int(counts[0]),
                    "cohort_courses_in_db": int(counts[1]),
                    "cohort_enrollments_in_db": int(counts[2]),
                    "cohort_activities_in_db": int(counts[3]),
                }
    finally:
        conn.close()


def parse_reference_datetime(raw_value: str) -> datetime:
    """Parse an ISO-8601 timestamp string and normalize to UTC."""
    parsed = datetime.fromisoformat(raw_value.strip())
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Seed deterministic 300-student synthetic Vietnamese cohort into EduAlto PostgreSQL."
    )
    parser.add_argument("--students", type=int, default=300, help="Number of synthetic cohort students (default: 300)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for deterministic generation (default: 42)")
    parser.add_argument(
        "--reference-now",
        type=str,
        default=None,
        help="Optional ISO-8601 UTC/offset timestamp (e.g. 2026-11-11T07:00:00Z) for reproducible cross-machine generation",
    )
    parser.add_argument(
        "--reset-cohort",
        action="store_true",
        help="Delete only existing @cohort.* / cohort-* records before re-seeding (preserves manual dev accounts)",
    )
    parser.add_argument(
        "--allow-remote",
        action="store_true",
        help="Allow running against non-local POSTGRES_HOST (blocked by default for safety)",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s %(message)s")
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    reference_now: Optional[datetime] = None
    if args.reference_now:
        try:
            reference_now = parse_reference_datetime(args.reference_now)
        except ValueError as exc:
            print(f"[ERROR] Invalid --reference-now timestamp: {exc}", file=sys.stderr)
            return 1

    db_config = DatabaseConfig()
    validate_target_host(db_config, allow_remote=args.allow_remote)

    logger.info("Building synthetic cohort plan (students=%d, seed=%d)...", args.students, args.seed)
    dataset = build_cohort_dataset(n_students=args.students, seed=args.seed, reference_now=reference_now)
    logger.info(
        "Generated in-memory plan: %d students, %d courses, %d enrollments, %d progress, %d quiz_attempts, %d assignment_submissions, %d notes, %d discussions, %d certificates, %d learning_activities",
        len(dataset.students),
        len(dataset.courses),
        len(dataset.enrollments),
        len(dataset.learning_progress),
        len(dataset.quiz_attempts),
        len(dataset.assignment_submissions),
        len(dataset.learning_notes),
        len(dataset.discussions),
        len(dataset.certificates),
        len(dataset.learning_activities),
    )
    logger.info("Persona distribution across enrollments: %s", dataset.persona_summary)
    logger.info("Applying to PostgreSQL %s:%s/%s...", db_config.host, db_config.port, db_config.database)

    summary = apply_cohort_to_db(db_config, dataset, reset=args.reset_cohort)
    logger.info("Database sync completed: %s", summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
