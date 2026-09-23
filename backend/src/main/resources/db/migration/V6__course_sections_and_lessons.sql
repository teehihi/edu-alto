create table if not exists sections (
    id uuid primary key,
    course_id uuid not null,
    title varchar(255) not null,
    description text null,
    position integer not null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null,
    constraint fk_sections_course foreign key (course_id) references courses(id) on delete cascade,
    constraint chk_sections_position check (position >= 1)
);

create index if not exists idx_sections_course_id on sections(course_id);
create index if not exists idx_sections_course_position on sections(course_id, position asc);

create table if not exists lessons (
    id uuid primary key,
    section_id uuid not null,
    title varchar(255) not null,
    slug varchar(255) null,
    description text null,
    content text null,
    lesson_type varchar(40) not null default 'TEXT',
    position integer not null,
    duration_seconds integer null default 0,
    is_preview boolean not null default false,
    media_key varchar(512) null,
    status varchar(40) not null default 'DRAFT',
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null,
    constraint fk_lessons_section foreign key (section_id) references sections(id) on delete cascade,
    constraint chk_lessons_position check (position >= 1),
    constraint chk_lessons_type check (lesson_type in ('TEXT', 'VIDEO', 'DOCUMENT', 'QUIZ', 'ASSIGNMENT')),
    constraint chk_lessons_status check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    constraint chk_lessons_duration check (duration_seconds is null or duration_seconds >= 0)
);

create index if not exists idx_lessons_section_id on lessons(section_id);
create index if not exists idx_lessons_section_position on lessons(section_id, position asc);
create index if not exists idx_lessons_type on lessons(lesson_type);
