-- V6__collaboration_social.sql
-- Documents, Saved Documents, Discussions, Discussion Comments, Conversations, Conversation Participants, Messages

create table if not exists documents (
    id uuid primary key,
    course_id uuid not null,
    lesson_id uuid null,
    uploaded_by uuid not null,
    title varchar(255) not null,
    file_name varchar(255) not null,
    storage_key varchar(500) not null,
    content_type varchar(120) not null,
    file_size_bytes bigint not null default 0,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_documents_course foreign key (course_id) references courses(id) on delete cascade,
    constraint fk_documents_lesson foreign key (lesson_id) references lessons(id) on delete set null,
    constraint fk_documents_uploader foreign key (uploaded_by) references users(id) on delete cascade
);

create index if not exists idx_documents_course_id on documents(course_id);
create index if not exists idx_documents_lesson_id on documents(lesson_id);

create table if not exists saved_documents (
    user_id uuid not null,
    document_id uuid not null,
    created_at timestamp with time zone not null default current_timestamp,
    constraint pk_saved_documents primary key (user_id, document_id),
    constraint fk_saved_documents_user foreign key (user_id) references users(id) on delete cascade,
    constraint fk_saved_documents_document foreign key (document_id) references documents(id) on delete cascade
);

create index if not exists idx_saved_documents_document_id on saved_documents(document_id);

create table if not exists discussions (
    id uuid primary key,
    course_id uuid not null,
    lesson_id uuid null,
    author_id uuid not null,
    title varchar(255) not null,
    body text not null,
    status varchar(40) not null default 'ACTIVE',
    deleted_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_discussions_course foreign key (course_id) references courses(id) on delete cascade,
    constraint fk_discussions_lesson foreign key (lesson_id) references lessons(id) on delete set null,
    constraint fk_discussions_author foreign key (author_id) references users(id) on delete cascade,
    constraint chk_discussions_status check (status in ('ACTIVE', 'CLOSED', 'PINNED', 'ARCHIVED'))
);

create index if not exists idx_discussions_course_id on discussions(course_id);
create index if not exists idx_discussions_author_id on discussions(author_id);

create table if not exists discussion_comments (
    id uuid primary key,
    discussion_id uuid not null,
    author_id uuid not null,
    parent_comment_id uuid null,
    body text not null,
    deleted_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_discussion_comments_discussion foreign key (discussion_id) references discussions(id) on delete cascade,
    constraint fk_discussion_comments_author foreign key (author_id) references users(id) on delete cascade,
    constraint fk_discussion_comments_parent foreign key (parent_comment_id) references discussion_comments(id) on delete cascade
);

create index if not exists idx_discussion_comments_discussion_id on discussion_comments(discussion_id);
create index if not exists idx_discussion_comments_parent_id on discussion_comments(parent_comment_id);

create table if not exists conversations (
    id uuid primary key,
    type varchar(40) not null default 'DIRECT',
    course_id uuid null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_conversations_course foreign key (course_id) references courses(id) on delete cascade,
    constraint chk_conversations_type check (type in ('DIRECT', 'GROUP', 'COURSE'))
);

create index if not exists idx_conversations_course_id on conversations(course_id);

create table if not exists conversation_participants (
    conversation_id uuid not null,
    user_id uuid not null,
    joined_at timestamp with time zone not null default current_timestamp,
    last_read_at timestamp with time zone null,
    constraint pk_conversation_participants primary key (conversation_id, user_id),
    constraint fk_conversation_participants_conversation foreign key (conversation_id) references conversations(id) on delete cascade,
    constraint fk_conversation_participants_user foreign key (user_id) references users(id) on delete cascade
);

create index if not exists idx_conversation_participants_user_id on conversation_participants(user_id);

create table if not exists messages (
    id uuid primary key,
    conversation_id uuid not null,
    sender_id uuid not null,
    body text not null,
    deleted_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint fk_messages_conversation foreign key (conversation_id) references conversations(id) on delete cascade,
    constraint fk_messages_sender foreign key (sender_id) references users(id) on delete cascade
);

create index if not exists idx_messages_conversation_created on messages(conversation_id, created_at);
