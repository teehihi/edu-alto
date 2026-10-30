create table if not exists notifications (
    id uuid primary key,
    recipient_id uuid not null references users(id) on delete cascade,
    type varchar(50) not null,
    title varchar(255) not null,
    message text not null,
    link_url varchar(1024),
    read_at timestamptz,
    created_at timestamptz not null default current_timestamp
);

create index if not exists idx_notifications_recipient_created on notifications(recipient_id, created_at desc);
create index if not exists idx_notifications_recipient_unread on notifications(recipient_id) where read_at is null;

INSERT INTO permissions (name, api_path, method, module, description)
VALUES
    ('VIEW_REALTIME_NOTIFICATIONS', '/api/v1/me/realtime-notifications', 'GET', 'STUDENT', 'Xem danh sách thông báo đẩy thời gian thực'),
    ('MARK_REALTIME_NOTIFICATION_READ', '/api/v1/me/realtime-notifications/*/read', 'POST', 'STUDENT', 'Đánh dấu thông báo đẩy đã đọc'),
    ('MARK_ALL_REALTIME_NOTIFICATIONS_READ', '/api/v1/me/realtime-notifications/read-all', 'POST', 'STUDENT', 'Đánh dấu tất cả thông báo đẩy đã đọc')
ON CONFLICT (api_path, method) DO UPDATE SET 
    name = EXCLUDED.name,
    module = EXCLUDED.module,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ADMIN' AND p.api_path LIKE '/api/v1/me/realtime-notifications%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'INSTRUCTOR' AND p.api_path LIKE '/api/v1/me/realtime-notifications%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'STUDENT' AND p.api_path LIKE '/api/v1/me/realtime-notifications%'
ON CONFLICT (role_id, permission_id) DO NOTHING;
