-- V3__course_catalog.sql
-- Categories, Courses, Course Categories, Sections, Lessons, Lesson Contents

create table if not exists categories (
    id uuid primary key,
    name varchar(120) not null,
    slug varchar(140) not null,
    parent_id uuid null,
    position integer not null default 0,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_categories_slug unique (slug),
    constraint fk_categories_parent foreign key (parent_id) references categories(id) on delete set null
);

create index if not exists idx_categories_parent_id on categories(parent_id);

create table if not exists courses (
    id uuid primary key,
    instructor_id uuid not null,
    title varchar(255) not null,
    slug varchar(280) not null,
    summary varchar(500) null,
    description text null,
    level varchar(40) not null default 'ALL_LEVELS',
    language varchar(20) not null default 'vi',
    price_amount numeric(12,2) not null default 0,
    currency varchar(3) not null default 'VND',
    status varchar(40) not null default 'DRAFT',
    thumbnail_url varchar(500) null,
    published_at timestamp with time zone null,
    deleted_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_courses_slug unique (slug),
    constraint fk_courses_instructor foreign key (instructor_id) references instructor_profiles(user_id) on delete restrict,
    constraint chk_courses_status check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

create index if not exists idx_courses_instructor_id on courses(instructor_id);
create index if not exists idx_courses_status_published_at on courses(status, published_at desc);
create index if not exists idx_courses_level on courses(level);

create table if not exists course_categories (
    course_id uuid not null,
    category_id uuid not null,
    created_at timestamp with time zone not null default current_timestamp,
    constraint pk_course_categories primary key (course_id, category_id),
    constraint fk_course_categories_course foreign key (course_id) references courses(id) on delete cascade,
    constraint fk_course_categories_category foreign key (category_id) references categories(id) on delete cascade
);

create index if not exists idx_course_categories_category_id on course_categories(category_id);

create table if not exists sections (
    id uuid primary key,
    course_id uuid not null,
    title varchar(255) not null,
    position integer not null default 0,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_sections_course_position unique (course_id, position),
    constraint fk_sections_course foreign key (course_id) references courses(id) on delete cascade
);

create index if not exists idx_sections_course_id on sections(course_id);

create table if not exists lessons (
    id uuid primary key,
    section_id uuid not null,
    title varchar(255) not null,
    slug varchar(280) not null,
    type varchar(40) not null default 'VIDEO',
    position integer not null default 0,
    status varchar(40) not null default 'DRAFT',
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_lessons_section_position unique (section_id, position),
    constraint fk_lessons_section foreign key (section_id) references sections(id) on delete cascade,
    constraint chk_lessons_status check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

create index if not exists idx_lessons_section_id on lessons(section_id);

create table if not exists lesson_contents (
    id uuid primary key,
    lesson_id uuid not null,
    content_type varchar(40) not null,
    body_text text null,
    video_url varchar(500) null,
    storage_key varchar(500) null,
    duration_seconds integer null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_lesson_contents_lesson_id unique (lesson_id),
    constraint fk_lesson_contents_lesson foreign key (lesson_id) references lessons(id) on delete cascade
);
