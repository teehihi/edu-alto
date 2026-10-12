alter table lesson_attachments
    add column visible_to_students boolean not null default true;
