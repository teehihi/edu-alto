-- V7__system_engagement.sql
-- File Assets, Audit Logs, Calendar Events, Reviews, Certificates, Notifications

create table if not exists file_assets (
    id uuid primary key,
    owner_id uuid not null,
    storage_key varchar(500) not null,
    original_name varchar(255) not null,
    mime_type varchar(120) not null,
    size_bytes bigint not null default 0,
    scan_status varchar(40) not null default 'PENDING',
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_file_assets_storage_key unique (storage_key),
    constraint fk_file_assets_owner foreign key (owner_id) references users(id) on delete cascade,
    constraint chk_file_assets_scan_status check (scan_status in ('PENDING', 'CLEAN', 'INFECTED'))
);

create index if not exists idx_file_assets_owner_id on file_assets(owner_id);

-- Optional foreign key from assignment_submissions to file_assets
alter table assignment_submissions
    add constraint fk_assignment_submissions_file_asset
    foreign key (file_asset_id) references file_assets(id) on delete set null;

create table if not exists audit_logs (
    id uuid primary key,
    actor_id uuid null,
    action varchar(120) not null,
    resource_type varchar(120) not null,
    resource_id uuid null,
    metadata jsonb null,
    created_at timestamp with time zone not null default current_timestamp,
    constraint fk_audit_logs_actor foreign key (actor_id) references users(id) on delete set null
);

create index if not exists idx_audit_logs_actor_id on audit_logs(actor_id);
create index if not exists idx_audit_logs_resource on audit_logs(resource_type, resource_id);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at desc);

create table if not exists calendar_events (
    id uuid primary key,
    owner_id uuid not null,
    course_id uuid null,
    title varchar(255) not null,
    start_at timestamp with time zone not null,
    end_at timestamp with time zone not null,
    status varchar(40) not null default 'SCHEDULED',
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_calendar_events_owner foreign key (owner_id) references users(id) on delete cascade,
    constraint fk_calendar_events_course foreign key (course_id) references courses(id) on delete cascade,
    constraint chk_calendar_events_status check (status in ('SCHEDULED', 'CANCELLED', 'COMPLETED'))
);

create index if not exists idx_calendar_events_owner_start on calendar_events(owner_id, start_at);

create table if not exists reviews (
    id uuid primary key,
    student_id uuid not null,
    course_id uuid not null,
    rating integer not null,
    comment text null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_reviews_student_course unique (student_id, course_id),
    constraint fk_reviews_student foreign key (student_id) references users(id) on delete cascade,
    constraint fk_reviews_course foreign key (course_id) references courses(id) on delete cascade,
    constraint chk_reviews_rating check (rating >= 1 and rating <= 5)
);

create index if not exists idx_reviews_course_id on reviews(course_id);

create table if not exists certificates (
    id uuid primary key,
    student_id uuid not null,
    course_id uuid not null,
    certificate_code varchar(100) not null,
    issued_at timestamp with time zone not null default current_timestamp,
    created_at timestamp with time zone not null default current_timestamp,
    constraint uk_certificates_code unique (certificate_code),
    constraint uk_certificates_student_course unique (student_id, course_id),
    constraint fk_certificates_student foreign key (student_id) references users(id) on delete cascade,
    constraint fk_certificates_course foreign key (course_id) references courses(id) on delete cascade
);

create index if not exists idx_certificates_student_id on certificates(student_id);

create table if not exists notifications (
    id uuid primary key,
    recipient_id uuid not null,
    type varchar(80) not null,
    channel varchar(40) not null default 'IN_APP',
    status varchar(40) not null default 'UNREAD',
    title varchar(255) not null,
    body text not null,
    payload jsonb null,
    read_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_notifications_recipient foreign key (recipient_id) references users(id) on delete cascade,
    constraint chk_notifications_channel check (channel in ('IN_APP', 'EMAIL')),
    constraint chk_notifications_status check (status in ('UNREAD', 'READ', 'ARCHIVED'))
);

create index if not exists idx_notifications_recipient_status_created on notifications(recipient_id, status, created_at desc);
