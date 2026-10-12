alter table quizzes
    add column questions_per_attempt integer not null default 0,
    add column duration_minutes integer not null default 0,
    add constraint chk_quizzes_questions_per_attempt check (questions_per_attempt >= 0 and questions_per_attempt <= 100),
    add constraint chk_quizzes_duration_minutes check (duration_minutes >= 0 and duration_minutes <= 600);

create table quiz_attempt_sessions (
    id uuid primary key,
    quiz_id uuid not null references quizzes(id) on delete cascade,
    student_id uuid not null references users(id) on delete cascade,
    status varchar(20) not null,
    started_at timestamptz not null,
    expires_at timestamptz,
    attempt_id uuid unique references quiz_attempts(id) on delete set null,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint chk_quiz_attempt_sessions_status check (status in ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED'))
);

create index idx_quiz_attempt_sessions_student_quiz_status
    on quiz_attempt_sessions(student_id, quiz_id, status, started_at desc);

create table quiz_attempt_session_questions (
    id uuid primary key,
    session_id uuid not null references quiz_attempt_sessions(id) on delete cascade,
    question_id uuid not null references quiz_questions(id) on delete cascade,
    position integer not null,
    constraint uq_quiz_attempt_session_questions_question unique (session_id, question_id),
    constraint uq_quiz_attempt_session_questions_position unique (session_id, position),
    constraint chk_quiz_attempt_session_questions_position check (position >= 1)
);

create table quiz_attempt_activity_events (
    id uuid primary key,
    attempt_id uuid not null references quiz_attempts(id) on delete cascade,
    event_type varchar(32) not null,
    occurred_at timestamptz not null,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint chk_quiz_attempt_activity_event_type check (
        event_type in ('TAB_HIDDEN', 'WINDOW_BLUR', 'COPY', 'PASTE')
    )
);

create index idx_quiz_attempt_activity_events_attempt
    on quiz_attempt_activity_events(attempt_id, occurred_at);
