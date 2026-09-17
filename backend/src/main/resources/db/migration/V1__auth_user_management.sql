create table if not exists users (
    id uuid primary key,
    full_name varchar(160) not null,
    email varchar(255) not null,
    password_hash varchar(255) not null,
    status varchar(40) not null,
    email_verified_at timestamp with time zone null,
    last_login_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null,
    constraint uk_users_email unique (email),
    constraint chk_users_status check (status in ('PENDING_VERIFICATION', 'ACTIVE', 'LOCKED', 'DISABLED'))
);

create index if not exists idx_users_status on users(status);

create table if not exists roles (
    id uuid primary key,
    name varchar(60) not null,
    description varchar(255) null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint uk_roles_name unique (name)
);

create table if not exists user_roles (
    user_id uuid not null,
    role_id uuid not null,
    created_at timestamp with time zone not null default current_timestamp,
    constraint pk_user_roles primary key (user_id, role_id),
    constraint fk_user_roles_user foreign key (user_id) references users(id),
    constraint fk_user_roles_role foreign key (role_id) references roles(id)
);

create table if not exists email_otps (
    id uuid primary key,
    user_id uuid not null,
    purpose varchar(40) not null,
    otp_hash varchar(255) not null,
    attempts integer not null,
    max_attempts integer not null,
    expires_at timestamp with time zone not null,
    verified_at timestamp with time zone null,
    consumed_at timestamp with time zone null,
    created_at timestamp with time zone not null,
    constraint fk_email_otps_user foreign key (user_id) references users(id),
    constraint chk_email_otps_purpose check (purpose in ('EMAIL_VERIFICATION', 'PASSWORD_RESET'))
);

create index if not exists idx_email_otps_user_purpose_expires_at on email_otps(user_id, purpose, expires_at);

create table if not exists refresh_tokens (
    id uuid primary key,
    user_id uuid not null,
    token_hash varchar(128) not null,
    device_name varchar(180) null,
    expires_at timestamp with time zone not null,
    revoked_at timestamp with time zone null,
    created_at timestamp with time zone not null,
    constraint uk_refresh_tokens_token_hash unique (token_hash),
    constraint fk_refresh_tokens_user foreign key (user_id) references users(id)
);

create index if not exists idx_refresh_tokens_user_expires_at on refresh_tokens(user_id, expires_at);
