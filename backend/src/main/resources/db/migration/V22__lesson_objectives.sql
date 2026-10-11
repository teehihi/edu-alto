create table lesson_objectives (
    lesson_id uuid not null references lessons(id) on delete cascade,
    position integer not null,
    objective varchar(300) not null,
    primary key (lesson_id, position),
    constraint chk_lesson_objectives_position check (position >= 0)
);
