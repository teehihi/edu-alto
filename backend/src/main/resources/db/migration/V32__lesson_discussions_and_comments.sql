create table if not exists discussions (
    id uuid primary key,
    course_id uuid not null references courses(id) on delete cascade,
    lesson_id uuid not null references lessons(id) on delete cascade,
    author_id uuid not null references users(id) on delete cascade,
    title varchar(200) not null,
    body text not null,
    video_timestamp_seconds integer null,
    status varchar(30) not null default 'OPEN',
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    deleted_at timestamptz null,
    constraint chk_discussions_title check (length(trim(title)) between 3 and 200),
    constraint chk_discussions_body check (length(trim(body)) between 3 and 5000),
    constraint chk_discussions_video_timestamp check (video_timestamp_seconds is null or video_timestamp_seconds >= 0),
    constraint chk_discussions_status check (status in ('OPEN', 'RESOLVED', 'CLOSED'))
);

create index if not exists idx_discussions_lesson_created on discussions(lesson_id, created_at desc) where deleted_at is null;
create index if not exists idx_discussions_course_created on discussions(course_id, created_at desc) where deleted_at is null;
create index if not exists idx_discussions_author on discussions(author_id);

create table if not exists discussion_comments (
    id uuid primary key,
    discussion_id uuid not null references discussions(id) on delete cascade,
    author_id uuid not null references users(id) on delete cascade,
    parent_comment_id uuid null references discussion_comments(id) on delete cascade,
    body text not null,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    deleted_at timestamptz null,
    constraint chk_discussion_comments_body check (length(trim(body)) between 1 and 3000)
);

create index if not exists idx_discussion_comments_disc_created on discussion_comments(discussion_id, created_at asc) where deleted_at is null;
create index if not exists idx_discussion_comments_author on discussion_comments(author_id);
