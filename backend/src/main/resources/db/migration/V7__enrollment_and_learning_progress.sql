create table enrollments (
    id uuid primary key,
    student_id uuid not null references users(id),
    course_id uuid not null references courses(id),
    status varchar(40) not null default 'ACTIVE',
    enrolled_at timestamptz not null default current_timestamp,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint uk_enrollments_student_course unique (student_id, course_id),
    constraint uk_enrollments_id_course unique (id, course_id),
    constraint chk_enrollments_status check (status = 'ACTIVE')
);

create index idx_enrollments_student_enrolled on enrollments(student_id, enrolled_at desc, id);
create index idx_enrollments_course_status on enrollments(course_id, status);

alter table sections add constraint uk_sections_id_course unique (id, course_id);
alter table lessons add constraint uk_lessons_id_section unique (id, section_id);

create table learning_progress (
    id uuid primary key,
    enrollment_id uuid not null,
    course_id uuid not null,
    section_id uuid not null,
    lesson_id uuid not null,
    completed_at timestamptz not null default current_timestamp,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint uk_learning_progress_enrollment_lesson unique (enrollment_id, lesson_id),
    constraint fk_progress_enrollment_course foreign key (enrollment_id, course_id)
        references enrollments(id, course_id) on delete cascade,
    constraint fk_progress_section_course foreign key (section_id, course_id)
        references sections(id, course_id) on delete cascade,
    constraint fk_progress_lesson_section foreign key (lesson_id, section_id)
        references lessons(id, section_id) on delete cascade
);

create index idx_learning_progress_lesson on learning_progress(lesson_id, section_id);
create index idx_learning_progress_section on learning_progress(section_id, course_id);
