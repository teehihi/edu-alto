alter table courses add constraint uk_courses_id_instructor unique (id, instructor_id);

create table assignments (
    id uuid primary key,
    course_id uuid not null,
    instructor_id uuid not null,
    title varchar(255) not null,
    description text not null,
    due_at timestamptz,
    max_score numeric(8, 2) not null,
    status varchar(40) not null default 'DRAFT',
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    published_at timestamptz,
    constraint fk_assignments_course_instructor foreign key (course_id, instructor_id)
        references courses(id, instructor_id) on delete cascade,
    constraint chk_assignments_status check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    constraint chk_assignments_max_score check (max_score > 0)
);

create index idx_assignments_course_status_due on assignments(course_id, status, due_at);
create index idx_assignments_instructor_created on assignments(instructor_id, created_at desc);

create table assignment_submissions (
    id uuid primary key,
    assignment_id uuid not null references assignments(id) on delete cascade,
    student_id uuid not null references users(id),
    response_text text not null,
    submitted_at timestamptz not null default current_timestamp,
    score numeric(8, 2),
    feedback text,
    graded_by uuid references users(id),
    graded_at timestamptz,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint uk_assignment_submissions_assignment_student unique (assignment_id, student_id),
    constraint chk_assignment_submissions_score_nonnegative check (score is null or score >= 0),
    constraint chk_assignment_submissions_grade_pair check (
        (score is null and graded_by is null and graded_at is null)
        or (score is not null and graded_by is not null and graded_at is not null)
    )
);

create index idx_assignment_submissions_student on assignment_submissions(student_id, submitted_at desc);
create index idx_assignment_submissions_assignment on assignment_submissions(assignment_id, submitted_at desc);
