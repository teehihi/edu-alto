-- V34: Lược đồ dữ liệu lưu trữ lịch sử hoạt động học tập (EDU-101 / EDU-97)
-- Quản lý chuỗi sự kiện học tập chuẩn hóa của học viên phục vụ theo dõi tiến độ và phân tích học tập (Learning Analytics)

create table learning_activities (
    id uuid primary key,
    student_id uuid not null references users(id) on delete cascade,
    course_id uuid not null references courses(id) on delete cascade,
    section_id uuid references sections(id) on delete set null,
    lesson_id uuid references lessons(id) on delete set null,
    activity_type varchar(50) not null,
    source_id uuid,
    occurred_at timestamptz not null default current_timestamp,
    metadata jsonb,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint chk_learning_activity_type check (
        activity_type in (
            'COURSE_ENROLLED',
            'COURSE_COMPLETED',
            'CERTIFICATE_ISSUED',
            'LESSON_VIEWED',
            'LESSON_COMPLETED',
            'VIDEO_WATCHED',
            'NOTE_CREATED',
            'RESOURCE_DOWNLOADED',
            'QUIZ_STARTED',
            'QUIZ_SUBMITTED',
            'ASSIGNMENT_SUBMITTED',
            'ASSIGNMENT_GRADED',
            'QUESTION_ASKED',
            'COMMENT_POSTED'
        )
    ),
    constraint uk_learning_activities_source_type unique (source_id, activity_type),
    constraint chk_learning_activity_time check (
        occurred_at <= current_timestamp + interval '5 minutes'
    )
);

-- Chỉ mục tối ưu hóa truy vấn dòng thời gian hoạt động của học viên
create index idx_learning_activities_student_time 
    on learning_activities(student_id, occurred_at desc);

-- Chỉ mục tối ưu hóa truy vấn hoạt động của học viên trong một khóa học cụ thể
create index idx_learning_activities_student_course_time 
    on learning_activities(student_id, course_id, occurred_at desc);

-- Chỉ mục tối ưu hóa truy vấn dòng hoạt động học tập toàn khóa học dành cho giảng viên
create index idx_learning_activities_course_time 
    on learning_activities(course_id, occurred_at desc);

-- Chỉ mục tối ưu hóa truy vấn thống kê theo loại hoạt động và thời gian phục vụ Analytics
create index idx_learning_activities_course_type_time 
    on learning_activities(course_id, activity_type, occurred_at desc);

-- Chỉ mục lọc theo bài học cụ thể
create index idx_learning_activities_lesson_time 
    on learning_activities(lesson_id, occurred_at desc) 
    where lesson_id is not null;

-- Bổ sung quyền hạn động (RBAC Permissions) cho phân hệ quản lý hoạt động học tập
INSERT INTO permissions (name, api_path, method, module, description)
VALUES
    ('RECORD_LEARNING_ACTIVITY', '/api/v1/learning/activities', 'POST', 'STUDENT', 'Ghi nhận sự kiện hoạt động học tập của học viên'),
    ('VIEW_MY_LEARNING_ACTIVITIES', '/api/v1/learning/activities/me', 'GET', 'STUDENT', 'Xem lịch sử dòng hoạt động học tập cá nhân'),
    ('VIEW_MY_LEARNING_ACTIVITY_SUMMARY', '/api/v1/learning/activities/me/summary', 'GET', 'STUDENT', 'Xem tóm tắt thống kê hoạt động học tập cá nhân'),
    ('VIEW_COURSE_LEARNING_ACTIVITIES', '/api/v1/learning/activities/courses/*', 'GET', 'INSTRUCTOR', 'Xem dòng hoạt động học tập của học viên trong khóa học'),
    ('VIEW_LEARNING_ACTIVITY_TYPES', '/api/v1/learning/activities/types', 'GET', 'STUDENT', 'Xem danh mục các loại sự kiện hoạt động học tập chuẩn hóa'),
    ('SYNC_LEARNING_ACTIVITIES', '/api/v1/learning/activities/sync', 'POST', 'ADMIN', 'Đồng bộ dữ liệu hoạt động học tập từ các module EduAlto')
ON CONFLICT (api_path, method) DO UPDATE SET 
    name = EXCLUDED.name,
    module = EXCLUDED.module,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- Phân quyền cho ADMIN
INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ADMIN' AND p.api_path LIKE '/api/v1/learning/activities%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Phân quyền cho INSTRUCTOR
INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'INSTRUCTOR' AND p.api_path LIKE '/api/v1/learning/activities%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Phân quyền cho STUDENT
INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'STUDENT' AND p.api_path IN (
    '/api/v1/learning/activities',
    '/api/v1/learning/activities/me',
    '/api/v1/learning/activities/me/summary',
    '/api/v1/learning/activities/types'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
