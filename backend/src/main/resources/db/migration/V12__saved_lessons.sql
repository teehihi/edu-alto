create table saved_lessons (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    lesson_id uuid not null references lessons(id) on delete cascade,
    created_at timestamptz not null default current_timestamp,
    constraint uk_saved_lessons_user_lesson unique (user_id, lesson_id)
);

create index idx_saved_lessons_user_created on saved_lessons(user_id, created_at desc, id);
