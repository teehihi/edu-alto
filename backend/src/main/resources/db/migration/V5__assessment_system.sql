-- V5__assessment_system.sql
-- Quizzes, Questions, Question Options, Quiz Attempts, Quiz Answers, Assignments, Assignment Submissions

create table if not exists quizzes (
    id uuid primary key,
    course_id uuid not null,
    lesson_id uuid null,
    title varchar(255) not null,
    duration_minutes integer null,
    passing_score numeric(5,2) null,
    max_attempts integer null default 1,
    available_from timestamp with time zone null,
    available_until timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_quizzes_course foreign key (course_id) references courses(id) on delete cascade,
    constraint fk_quizzes_lesson foreign key (lesson_id) references lessons(id) on delete set null
);

create index if not exists idx_quizzes_course_id on quizzes(course_id);
create index if not exists idx_quizzes_lesson_id on quizzes(lesson_id);

create table if not exists questions (
    id uuid primary key,
    quiz_id uuid not null,
    type varchar(40) not null,
    prompt text not null,
    points numeric(5,2) not null default 1.00,
    position integer not null default 0,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_questions_quiz_position unique (quiz_id, position),
    constraint fk_questions_quiz foreign key (quiz_id) references quizzes(id) on delete cascade,
    constraint chk_questions_type check (type in ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_TEXT'))
);

create index if not exists idx_questions_quiz_id on questions(quiz_id);

create table if not exists question_options (
    id uuid primary key,
    question_id uuid not null,
    content text not null,
    is_correct boolean not null default false,
    position integer not null default 0,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_question_options_question_position unique (question_id, position),
    constraint fk_question_options_question foreign key (question_id) references questions(id) on delete cascade
);

create index if not exists idx_question_options_question_id on question_options(question_id);

create table if not exists quiz_attempts (
    id uuid primary key,
    quiz_id uuid not null,
    student_id uuid not null,
    status varchar(40) not null default 'IN_PROGRESS',
    score numeric(5,2) null,
    started_at timestamp with time zone not null default current_timestamp,
    submitted_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_quiz_attempts_quiz foreign key (quiz_id) references quizzes(id) on delete cascade,
    constraint fk_quiz_attempts_student foreign key (student_id) references users(id) on delete cascade,
    constraint chk_quiz_attempts_status check (status in ('IN_PROGRESS', 'SUBMITTED', 'GRADED'))
);

create index if not exists idx_quiz_attempts_student_quiz_submitted on quiz_attempts(student_id, quiz_id, submitted_at);

create table if not exists quiz_answers (
    id uuid primary key,
    attempt_id uuid not null,
    question_id uuid not null,
    selected_option_id uuid null,
    text_answer text null,
    is_correct boolean null,
    awarded_points numeric(5,2) null default 0.00,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_quiz_answers_attempt_question unique (attempt_id, question_id),
    constraint fk_quiz_answers_attempt foreign key (attempt_id) references quiz_attempts(id) on delete cascade,
    constraint fk_quiz_answers_question foreign key (question_id) references questions(id) on delete cascade,
    constraint fk_quiz_answers_selected_option foreign key (selected_option_id) references question_options(id) on delete set null
);

create index if not exists idx_quiz_answers_attempt_id on quiz_answers(attempt_id);

create table if not exists assignments (
    id uuid primary key,
    course_id uuid not null,
    lesson_id uuid null,
    title varchar(255) not null,
    instructions text null,
    due_at timestamp with time zone null,
    max_score numeric(5,2) not null default 100.00,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_assignments_course foreign key (course_id) references courses(id) on delete cascade,
    constraint fk_assignments_lesson foreign key (lesson_id) references lessons(id) on delete set null
);

create index if not exists idx_assignments_course_id on assignments(course_id);
create index if not exists idx_assignments_lesson_id on assignments(lesson_id);

create table if not exists assignment_submissions (
    id uuid primary key,
    assignment_id uuid not null,
    student_id uuid not null,
    graded_by uuid null,
    file_asset_id uuid null,
    content text null,
    status varchar(40) not null default 'SUBMITTED',
    score numeric(5,2) null,
    feedback text null,
    submitted_at timestamp with time zone not null default current_timestamp,
    graded_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_assignment_submissions_assignment_student unique (assignment_id, student_id),
    constraint fk_assignment_submissions_assignment foreign key (assignment_id) references assignments(id) on delete cascade,
    constraint fk_assignment_submissions_student foreign key (student_id) references users(id) on delete cascade,
    constraint fk_assignment_submissions_grader foreign key (graded_by) references users(id) on delete set null,
    constraint chk_assignment_submissions_status check (status in ('DRAFT', 'SUBMITTED', 'GRADED', 'RETURNED'))
);

create index if not exists idx_assignment_submissions_student on assignment_submissions(student_id);
create index if not exists idx_assignment_submissions_assignment on assignment_submissions(assignment_id);
