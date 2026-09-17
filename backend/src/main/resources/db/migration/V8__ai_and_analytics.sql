-- V8__ai_and_analytics.sql
-- Learning Signals, Analytics Snapshots, AI Model Versions, Recommendations, Recommendation Items, Recommendation Reasons

create table if not exists learning_signals (
    id uuid primary key,
    user_id uuid not null,
    course_id uuid null,
    lesson_id uuid null,
    signal_type varchar(80) not null,
    metadata jsonb null,
    occurred_at timestamp with time zone not null default current_timestamp,
    constraint fk_learning_signals_user foreign key (user_id) references users(id) on delete cascade,
    constraint fk_learning_signals_course foreign key (course_id) references courses(id) on delete set null,
    constraint fk_learning_signals_lesson foreign key (lesson_id) references lessons(id) on delete set null
);

create index if not exists idx_learning_signals_user_occurred on learning_signals(user_id, occurred_at desc);
create index if not exists idx_learning_signals_type on learning_signals(signal_type);

create table if not exists analytics_snapshots (
    id uuid primary key,
    snapshot_type varchar(60) not null,
    target_id uuid null,
    payload jsonb not null,
    calculated_at timestamp with time zone not null default current_timestamp
);

create index if not exists idx_analytics_snapshots_type_target on analytics_snapshots(snapshot_type, target_id);
create index if not exists idx_analytics_snapshots_calculated_at on analytics_snapshots(calculated_at desc);

create table if not exists ai_model_versions (
    id uuid primary key,
    name varchar(120) not null,
    version varchar(40) not null,
    status varchar(40) not null default 'ACTIVE',
    activated_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_ai_model_versions_name_version unique (name, version),
    constraint chk_ai_model_versions_status check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED'))
);

create table if not exists recommendations (
    id uuid primary key,
    user_id uuid not null,
    model_version_id uuid null,
    status varchar(40) not null default 'ACTIVE',
    generated_at timestamp with time zone not null default current_timestamp,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_recommendations_user foreign key (user_id) references users(id) on delete cascade,
    constraint fk_recommendations_model foreign key (model_version_id) references ai_model_versions(id) on delete set null,
    constraint chk_recommendations_status check (status in ('ACTIVE', 'EXPIRED', 'DISMISSED'))
);

create index if not exists idx_recommendations_user_generated on recommendations(user_id, generated_at desc);

create table if not exists recommendation_items (
    id uuid primary key,
    recommendation_id uuid not null,
    item_type varchar(40) not null default 'COURSE',
    item_id uuid not null,
    rank integer not null default 1,
    score numeric(5,4) null,
    created_at timestamp with time zone not null default current_timestamp,
    constraint fk_recommendation_items_recommendation foreign key (recommendation_id) references recommendations(id) on delete cascade
);

create index if not exists idx_recommendation_items_rec_id on recommendation_items(recommendation_id);

create table if not exists recommendation_reasons (
    id uuid primary key,
    recommendation_item_id uuid not null,
    reason_code varchar(120) not null,
    reason_text text null,
    created_at timestamp with time zone not null default current_timestamp,
    constraint fk_recommendation_reasons_item foreign key (recommendation_item_id) references recommendation_items(id) on delete cascade
);

create index if not exists idx_recommendation_reasons_item_id on recommendation_reasons(recommendation_item_id);
