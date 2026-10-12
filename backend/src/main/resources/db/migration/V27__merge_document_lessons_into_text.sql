update lessons
set lesson_type = 'TEXT'
where lesson_type = 'DOCUMENT';

alter table lessons
    drop constraint chk_lessons_type;

alter table lessons
    add constraint chk_lessons_type
    check (lesson_type in ('TEXT', 'VIDEO', 'QUIZ', 'ASSIGNMENT'));
