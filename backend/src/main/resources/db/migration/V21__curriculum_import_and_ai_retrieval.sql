create table curriculum_import_jobs (
    id uuid primary key,
    course_id uuid not null references courses(id) on delete cascade,
    instructor_id uuid not null references users(id) on delete cascade,
    status varchar(20) not null default 'QUEUED',
    preview_json text,
    message varchar(1000),
    chapter_count integer,
    lesson_count integer,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint chk_curriculum_import_status check (status in ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'APPLIED')),
    constraint chk_curriculum_import_chapters check (chapter_count is null or chapter_count between 1 and 20),
    constraint chk_curriculum_import_lessons check (lesson_count is null or lesson_count between 1 and 100)
);

create index idx_curriculum_import_course_instructor on curriculum_import_jobs(course_id, instructor_id, created_at desc);
create index idx_curriculum_import_status on curriculum_import_jobs(status);

create index if not exists idx_courses_ai_search on courses using gin
    (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

create index if not exists idx_lessons_ai_search on lessons using gin
    (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')));
