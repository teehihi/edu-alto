-- V4__enrollment_and_progress.sql
-- Enrollments, Learning Progress, Notes

create table if not exists enrollments (
    id uuid primary key,
    student_id uuid not null,
    course_id uuid not null,
    status varchar(40) not null default 'ACTIVE',
    enrolled_at timestamp with time zone not null default current_timestamp,
    completed_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_enrollments_student_course unique (student_id, course_id),
    constraint fk_enrollments_student foreign key (student_id) references users(id) on delete cascade,
    constraint fk_enrollments_course foreign key (course_id) references courses(id) on delete cascade,
    constraint chk_enrollments_status check (status in ('ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'))
);

create index if not exists idx_enrollments_course_status on enrollments(course_id, status);
create index if not exists idx_enrollments_student_id on enrollments(student_id);

create table if not exists learning_progress (
    id uuid primary key,
    enrollment_id uuid not null,
    lesson_id uuid not null,
    progress_percent numeric(5,2) not null default 0.00,
    completed_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_learning_progress_enrollment_lesson unique (enrollment_id, lesson_id),
    constraint fk_learning_progress_enrollment foreign key (enrollment_id) references enrollments(id) on delete cascade,
    constraint fk_learning_progress_lesson foreign key (lesson_id) references lessons(id) on delete cascade,
    constraint chk_learning_progress_percent check (progress_percent >= 0 and progress_percent <= 100)
);

create index if not exists idx_learning_progress_lesson_id on learning_progress(lesson_id);

create table if not exists notes (
    id uuid primary key,
    user_id uuid not null,
    course_id uuid not null,
    lesson_id uuid null,
    video_second integer null,
    body_text text not null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_notes_user foreign key (user_id) references users(id) on delete cascade,
    constraint fk_notes_course foreign key (course_id) references courses(id) on delete cascade,
    constraint fk_notes_lesson foreign key (lesson_id) references lessons(id) on delete set null
);

create index if not exists idx_notes_user_course on notes(user_id, course_id);
create index if not exists idx_notes_user_lesson on notes(user_id, lesson_id);
