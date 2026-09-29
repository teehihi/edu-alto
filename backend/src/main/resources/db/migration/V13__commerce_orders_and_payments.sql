create table orders (
    id uuid primary key,
    student_id uuid not null references users(id),
    status varchar(40) not null default 'PENDING_PAYMENT',
    currency varchar(3) not null default 'VND',
    subtotal numeric(12, 2) not null,
    total numeric(12, 2) not null,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint chk_orders_status check (status in ('PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED')),
    constraint chk_orders_currency check (currency = 'VND'),
    constraint chk_orders_amounts check (subtotal >= 0 and total >= 0 and subtotal = total)
);

create index idx_orders_student_created on orders(student_id, created_at desc, id);
create index idx_orders_status_created on orders(status, created_at);

create table order_items (
    id uuid primary key,
    order_id uuid not null references orders(id) on delete cascade,
    course_id uuid not null references courses(id),
    course_title varchar(255) not null,
    unit_price numeric(12, 2) not null,
    created_at timestamptz not null default current_timestamp,
    constraint uk_order_items_order_course unique (order_id, course_id),
    constraint chk_order_items_unit_price check (unit_price > 0)
);

create index idx_order_items_course on order_items(course_id);

create table payments (
    id uuid primary key,
    order_id uuid not null references orders(id),
    provider varchar(30) not null,
    provider_txn_ref varchar(100) not null,
    amount_minor_units bigint not null,
    status varchar(30) not null default 'PENDING',
    paid_at timestamptz null,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint uk_payments_provider_txn_ref unique (provider, provider_txn_ref),
    constraint uk_payments_order_provider unique (order_id, provider),
    constraint chk_payments_provider check (provider = 'VNPAY'),
    constraint chk_payments_status check (status in ('PENDING', 'PAID', 'FAILED')),
    constraint chk_payments_amount check (amount_minor_units > 0)
);

create index idx_payments_status_created on payments(status, created_at);
