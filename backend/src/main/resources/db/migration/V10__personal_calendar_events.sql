create table calendar_events (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    course_id uuid references courses(id) on delete set null,
    title varchar(200) not null,
    description text,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    status varchar(20) not null default 'SCHEDULED',
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint chk_calendar_events_period check (ends_at > starts_at),
    constraint chk_calendar_events_status check (status in ('SCHEDULED', 'COMPLETED', 'CANCELLED'))
);

create index idx_calendar_events_user_start_end on calendar_events(user_id, starts_at, ends_at);
create index idx_calendar_events_course on calendar_events(course_id) where course_id is not null;
