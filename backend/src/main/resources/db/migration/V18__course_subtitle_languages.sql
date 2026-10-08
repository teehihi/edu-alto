create table course_subtitle_languages (
    course_id uuid not null references courses(id) on delete cascade,
    position integer not null,
    language varchar(20) not null,
    constraint pk_course_subtitle_languages primary key (course_id, position),
    constraint uk_course_subtitle_languages_course_language unique (course_id, language)
);
