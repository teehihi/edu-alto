create table saved_lesson_resources (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    attachment_id uuid not null references lesson_attachments(id) on delete cascade,
    created_at timestamptz not null default current_timestamp,
    constraint uq_saved_lesson_resources_user_attachment unique (user_id, attachment_id)
);

create index idx_saved_lesson_resources_user_created
    on saved_lesson_resources(user_id, created_at desc);
