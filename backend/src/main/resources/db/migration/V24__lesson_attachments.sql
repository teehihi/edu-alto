create table lesson_attachments (
    lesson_id uuid not null references lessons(id) on delete cascade,
    position integer not null,
    id uuid not null unique,
    object_key varchar(512) not null,
    file_name varchar(255) not null,
    content_type varchar(150) not null,
    content_length bigint not null,
    primary key (lesson_id, position),
    constraint chk_lesson_attachments_position check (position >= 0),
    constraint chk_lesson_attachments_length check (content_length > 0)
);
