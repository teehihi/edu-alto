create table if not exists courses (
    id uuid primary key,
    instructor_id uuid not null,
    title varchar(255) not null,
    slug varchar(255) not null,
    tagline varchar(500) null,
    description text not null,
    thumbnail_key varchar(512) null,
    price numeric(12, 2) not null default 0.00,
    original_price numeric(12, 2) null,
    level varchar(40) not null default 'ALL_LEVELS',
    language varchar(20) not null default 'vi',
    status varchar(40) not null default 'DRAFT',
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null,
    published_at timestamp with time zone null,
    constraint fk_courses_instructor foreign key (instructor_id) references users(id),
    constraint uk_courses_slug unique (slug),
    constraint chk_courses_status check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    constraint chk_courses_level check (level in ('ALL_LEVELS', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    constraint chk_courses_price check (price >= 0),
    constraint chk_courses_original_price check (original_price is null or original_price >= price)
);

create index if not exists idx_courses_instructor_id on courses(instructor_id);
create index if not exists idx_courses_status_published_at on courses(status, published_at desc);
create index if not exists idx_courses_level on courses(level);
create index if not exists idx_courses_price on courses(price);
