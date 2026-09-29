alter table orders drop constraint chk_orders_status;
alter table orders add constraint chk_orders_status
    check (status in ('PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PAID', 'PAYMENT_FAILED'));
alter table orders add column transfer_reference varchar(24);
update orders set transfer_reference = 'EA' || upper(substr(replace(id::text, '-', ''), 1, 22));
alter table orders alter column transfer_reference set not null;
create unique index uk_orders_transfer_reference on orders(transfer_reference);

alter table payments drop constraint chk_payments_provider;
alter table payments add constraint chk_payments_provider check (provider in ('VNPAY', 'MOMO', 'VIETQR'));
alter table payments drop constraint uk_payments_order_provider;
alter table payments add constraint uk_payments_order unique (order_id);

create table manual_payment_confirmations (
    id uuid primary key,
    payment_id uuid not null unique references payments(id),
    confirmed_by uuid not null references users(id),
    receipt_reference varchar(200) not null,
    confirmed_at timestamptz not null default current_timestamp
);

create index idx_manual_payment_confirmations_admin on manual_payment_confirmations(confirmed_by, confirmed_at desc);
