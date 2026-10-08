alter table payments drop constraint chk_payments_provider;
alter table payments add constraint chk_payments_provider
    check (provider in ('VNPAY', 'MOMO', 'VIETQR', 'SEPAY', 'STRIPE'));
