-- Ensure default system roles exist
INSERT INTO roles (id, name, description, created_at, updated_at)
VALUES 
    ('00000000-0000-0000-0000-000000000010'::uuid, 'ADMIN', 'Quản trị viên hệ thống', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000020'::uuid, 'INSTRUCTOR', 'Giảng viên', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000030'::uuid, 'STUDENT', 'Học viên', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET updated_at = NOW();
