-- V2__profiles_and_permissions.sql
-- Permissions, Role Permissions, Student Profiles, Instructor Profiles

create table if not exists permissions (
    id uuid primary key,
    code varchar(100) not null,
    name varchar(120) not null,
    description varchar(255) null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_permissions_code unique (code)
);

create table if not exists role_permissions (
    role_id uuid not null,
    permission_id uuid not null,
    created_at timestamp with time zone not null default current_timestamp,
    constraint pk_role_permissions primary key (role_id, permission_id),
    constraint fk_role_permissions_role foreign key (role_id) references roles(id) on delete cascade,
    constraint fk_role_permissions_permission foreign key (permission_id) references permissions(id) on delete cascade
);

create index if not exists idx_role_permissions_permission_id on role_permissions(permission_id);

create table if not exists student_profiles (
    user_id uuid primary key,
    headline varchar(180) null,
    learning_goal text null,
    avatar_url varchar(500) null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_student_profiles_user foreign key (user_id) references users(id) on delete cascade
);

create table if not exists instructor_profiles (
    user_id uuid primary key,
    bio text null,
    expertise varchar(255) null,
    verified_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_instructor_profiles_user foreign key (user_id) references users(id) on delete cascade
);
