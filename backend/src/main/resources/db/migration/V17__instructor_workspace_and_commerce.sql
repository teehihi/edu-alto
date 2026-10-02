-- Commerce promotions and order discount snapshots
alter table orders add column discount_total numeric(12, 2) not null default 0;
alter table orders drop constraint chk_orders_amounts;
alter table orders add constraint chk_orders_amounts
    check (subtotal >= 0 and discount_total >= 0 and total >= 0 and subtotal = total + discount_total);

alter table order_items add column list_price numeric(12, 2);
alter table order_items add column discount_amount numeric(12, 2) not null default 0;
alter table order_items add column promotion_id uuid;
alter table order_items add column promotion_code varchar(40);
update order_items set list_price = unit_price;
alter table order_items alter column list_price set not null;
alter table order_items drop constraint chk_order_items_unit_price;
alter table order_items add constraint chk_order_items_unit_price check (unit_price >= 0);
alter table order_items add constraint chk_order_items_discount check (discount_amount >= 0 and list_price >= unit_price);

create table course_promotions (
    id uuid primary key,
    course_id uuid not null references courses(id) on delete cascade,
    name varchar(120) not null,
    code varchar(40) not null,
    discount_type varchar(16) not null,
    discount_value numeric(12, 2) not null,
    max_redemptions integer,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    enabled boolean not null default true,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint uk_course_promotions_code unique (code),
    constraint chk_course_promotions_type check (discount_type in ('PERCENT', 'FIXED')),
    constraint chk_course_promotions_value check (discount_value > 0),
    constraint chk_course_promotions_max check (max_redemptions is null or max_redemptions > 0),
    constraint chk_course_promotions_dates check (ends_at > starts_at)
);
create index idx_course_promotions_course on course_promotions(course_id, created_at desc);

create table promotion_redemptions (
    id uuid primary key,
    promotion_id uuid not null references course_promotions(id),
    order_id uuid not null references orders(id) on delete cascade,
    order_item_id uuid not null references order_items(id) on delete cascade,
    student_id uuid not null references users(id),
    discount_amount numeric(12, 2) not null,
    status varchar(16) not null,
    reserved_until timestamptz not null,
    redeemed_at timestamptz,
    created_at timestamptz not null default current_timestamp,
    constraint uk_promotion_redemptions_order unique (order_id),
    constraint chk_promotion_redemptions_discount check (discount_amount > 0),
    constraint chk_promotion_redemptions_status check (status in ('RESERVED', 'REDEEMED', 'RELEASED'))
);
create index idx_promotion_redemptions_capacity on promotion_redemptions(promotion_id, status, reserved_until);

alter table order_items add constraint fk_order_items_promotion foreign key (promotion_id) references course_promotions(id);

-- Payment review and promotion checkout expiry
alter table orders add column expires_at timestamptz;
alter table orders add column payment_review_reason varchar(80);

alter table payments drop constraint chk_payments_status;
alter table payments add constraint chk_payments_status check (status in ('PENDING', 'PAID', 'FAILED', 'REVIEW'));

-- Persistent instructor messaging
create table conversations (
    id uuid primary key,
    instructor_id uuid not null references users(id),
    student_id uuid not null references users(id),
    instructor_blocked_at timestamp with time zone null,
    instructor_hidden_at timestamp with time zone null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint uk_conversations_instructor_student unique (instructor_id, student_id),
    constraint chk_conversations_different_participants check (instructor_id <> student_id)
);

create index idx_conversations_instructor_updated on conversations(instructor_id, instructor_hidden_at, updated_at desc);
create index idx_conversations_student_updated on conversations(student_id, updated_at desc);

create table messages (
    id uuid primary key,
    conversation_id uuid not null references conversations(id) on delete cascade,
    sender_id uuid not null references users(id),
    body varchar(4000) not null,
    created_at timestamp with time zone not null default current_timestamp,
    read_at timestamp with time zone null,
    constraint chk_messages_body_not_blank check (length(trim(body)) > 0)
);

create index idx_messages_conversation_created on messages(conversation_id, created_at desc, id desc);
create index idx_messages_unread on messages(conversation_id, read_at) where read_at is null;

-- Instructor announcements and student feed
create table instructor_notifications (
    id uuid primary key,
    instructor_id uuid not null references users(id),
    title varchar(255) not null,
    description varchar(5000) not null,
    link_url varchar(2048),
    audience varchar(32) not null,
    image_key varchar(512),
    status varchar(16) not null default 'DRAFT',
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    published_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    deleted_at timestamp with time zone,
    constraint chk_instructor_notifications_audience check (audience in ('ALL_STUDENTS', 'ENROLLED_STUDENTS')),
    constraint chk_instructor_notifications_status check (status in ('DRAFT', 'PUBLISHED')),
    constraint chk_instructor_notifications_period check (starts_at is null or ends_at is null or starts_at < ends_at),
    constraint chk_instructor_notifications_title check (length(trim(title)) > 0),
    constraint chk_instructor_notifications_description check (length(trim(description)) > 0)
);

create index idx_instructor_notifications_owner_status_created
    on instructor_notifications(instructor_id, status, created_at desc)
    where deleted_at is null;

create index idx_instructor_notifications_published_period
    on instructor_notifications(instructor_id, starts_at, ends_at)
    where deleted_at is null and status = 'PUBLISHED';

-- Instructor replies to course reviews
alter table course_reviews
    add column instructor_reply varchar(2000),
    add column instructor_replied_at timestamptz;

alter table course_reviews
    add constraint chk_course_reviews_instructor_reply
        check (instructor_reply is null or length(trim(instructor_reply)) > 0);

alter table course_reviews
    add constraint chk_course_reviews_instructor_reply_timestamp
        check ((instructor_reply is null) = (instructor_replied_at is null));

-- Persistent course wishlists
create table course_wishlists (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    course_id uuid not null references courses(id) on delete cascade,
    created_at timestamptz not null default current_timestamp,
    constraint uk_course_wishlists_user_course unique (user_id, course_id)
);

create index idx_course_wishlists_course on course_wishlists(course_id, created_at desc);

-- Issued course completion certificates
create table certificates (
    id uuid primary key,
    student_id uuid not null references users(id),
    course_id uuid not null references courses(id),
    enrollment_id uuid not null unique,
    certificate_number varchar(48) not null unique,
    student_name varchar(255) not null,
    course_title varchar(255) not null,
    instructor_name varchar(255) not null,
    issued_at timestamptz not null,
    created_at timestamptz not null default current_timestamp,
    constraint fk_certificates_enrollment_course foreign key (enrollment_id, course_id)
        references enrollments(id, course_id) on delete cascade
);

create index idx_certificates_student_issued on certificates(student_id, issued_at desc, id);
create index idx_certificates_course on certificates(course_id);
