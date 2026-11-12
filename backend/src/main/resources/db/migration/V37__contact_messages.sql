create table contact_messages (
    id uuid primary key,
    full_name varchar(120) not null,
    email varchar(255) not null,
    message text not null,
    status varchar(32) not null default 'NEW',
    created_at timestamp with time zone not null default current_timestamp
);

create index idx_contact_messages_created_at on contact_messages (created_at desc);
