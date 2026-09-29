create table course_reviews (
    id uuid primary key,
    student_id uuid not null references users(id) on delete cascade,
    course_id uuid not null references courses(id) on delete cascade,
    rating smallint not null,
    comment varchar(2000) not null,
    status varchar(20) not null default 'PUBLISHED',
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint uk_course_reviews_student_course unique (student_id, course_id),
    constraint chk_course_reviews_rating check (rating between 1 and 5),
    constraint chk_course_reviews_status check (status in ('PUBLISHED', 'HIDDEN')),
    constraint chk_course_reviews_comment check (length(trim(comment)) > 0)
);

create index idx_course_reviews_course_status_created
    on course_reviews(course_id, status, created_at desc, id);
create index idx_course_reviews_student on course_reviews(student_id);
