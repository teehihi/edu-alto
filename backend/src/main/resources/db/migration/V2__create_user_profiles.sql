create table if not exists profiles (
    user_id uuid primary key,
    headline varchar(255) null,
    bio text null,
    avatar_url varchar(1024) null,
    language varchar(20) not null default 'vi',
    website_url varchar(1024) null,
    x_url varchar(1024) null,
    linkedin_url varchar(1024) null,
    youtube_url varchar(1024) null,
    facebook_url varchar(1024) null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null,
    constraint fk_profiles_user foreign key (user_id) references users(id) on delete cascade
);

create table if not exists student_profiles (
    user_id uuid primary key,
    learning_goal text null,
    occupation varchar(120) null,
    education_level varchar(120) null,
    interests text null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null,
    constraint fk_student_profiles_user foreign key (user_id) references users(id) on delete cascade
);

create table if not exists instructor_profiles (
    user_id uuid primary key,
    expertise varchar(255) not null,
    experience_years integer null,
    teaching_experience text null,
    qualification_summary text null,
    specialties text null,
    verified_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null,
    constraint fk_instructor_profiles_user foreign key (user_id) references users(id) on delete cascade
);
