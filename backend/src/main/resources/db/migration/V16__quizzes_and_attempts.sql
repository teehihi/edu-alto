create table quizzes (
    id uuid primary key,
    lesson_id uuid not null unique,
    passing_score numeric(5, 2) not null,
    created_at timestamp with time zone not null default current_timestamp,
    constraint fk_quizzes_lesson foreign key (lesson_id) references lessons(id) on delete cascade,
    constraint chk_quizzes_passing_score check (passing_score >= 0 and passing_score <= 100)
);

create table quiz_questions (
    id uuid primary key,
    quiz_id uuid not null,
    prompt text not null,
    position integer not null,
    constraint fk_quiz_questions_quiz foreign key (quiz_id) references quizzes(id) on delete cascade,
    constraint chk_quiz_questions_position check (position >= 1)
);

create index idx_quiz_questions_quiz_position on quiz_questions(quiz_id, position);

create table quiz_options (
    id uuid primary key,
    question_id uuid not null,
    label text not null,
    is_correct boolean not null default false,
    position integer not null,
    constraint fk_quiz_options_question foreign key (question_id) references quiz_questions(id) on delete cascade,
    constraint chk_quiz_options_position check (position >= 1)
);

create index idx_quiz_options_question_position on quiz_options(question_id, position);

create table quiz_attempts (
    id uuid primary key,
    quiz_id uuid not null,
    student_id uuid not null,
    score numeric(5, 2) not null,
    correct_answers integer not null,
    total_questions integer not null,
    passed boolean not null,
    submitted_at timestamp with time zone not null default current_timestamp,
    constraint fk_quiz_attempts_quiz foreign key (quiz_id) references quizzes(id) on delete cascade,
    constraint fk_quiz_attempts_student foreign key (student_id) references users(id) on delete cascade,
    constraint chk_quiz_attempts_score check (score >= 0 and score <= 100),
    constraint chk_quiz_attempts_questions check (correct_answers >= 0 and total_questions > 0 and correct_answers <= total_questions)
);

create index idx_quiz_attempts_student_quiz on quiz_attempts(student_id, quiz_id, submitted_at desc);

create table quiz_attempt_answers (
    id uuid primary key,
    attempt_id uuid not null,
    question_id uuid not null,
    selected_option_id uuid not null,
    is_correct boolean not null,
    constraint fk_quiz_attempt_answers_attempt foreign key (attempt_id) references quiz_attempts(id) on delete cascade,
    constraint fk_quiz_attempt_answers_question foreign key (question_id) references quiz_questions(id) on delete cascade,
    constraint fk_quiz_attempt_answers_option foreign key (selected_option_id) references quiz_options(id) on delete cascade,
    constraint uq_quiz_attempt_answers_question unique (attempt_id, question_id)
);
