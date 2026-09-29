create table learning_notes (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    lesson_id uuid null references lessons(id) on delete set null,
    title varchar(120) not null,
    content text not null,
    video_second integer null,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint chk_learning_notes_title check (length(trim(title)) between 1 and 120),
    constraint chk_learning_notes_content check (length(trim(content)) between 1 and 5000),
    constraint chk_learning_notes_video_second check (video_second is null or video_second >= 0)
);

create index idx_learning_notes_user_updated on learning_notes(user_id, updated_at desc, id);
create index idx_learning_notes_lesson on learning_notes(lesson_id) where lesson_id is not null;
