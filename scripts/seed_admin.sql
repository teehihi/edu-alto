DO $$
DECLARE
    v_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
    v_admin_role_id uuid := '00000000-0000-0000-0000-000000000010'::uuid;
    v_instructor_role_id uuid := '00000000-0000-0000-0000-000000000020'::uuid;
    v_student_role_id uuid := '00000000-0000-0000-0000-000000000030'::uuid;
BEGIN
    INSERT INTO roles (id, name, description, created_at, updated_at)
    VALUES 
        (v_admin_role_id, 'ADMIN', 'Quản trị viên hệ thống', NOW(), NOW()),
        (v_instructor_role_id, 'INSTRUCTOR', 'Giảng viên', NOW(), NOW()),
        (v_student_role_id, 'STUDENT', 'Học viên', NOW(), NOW())
    ON CONFLICT (name) DO UPDATE SET updated_at = NOW();

    INSERT INTO users (id, full_name, email, password_hash, status, email_verified_at, created_at, updated_at)
    VALUES (
        v_user_id,
        'Quản trị viên EduAlto',
        'admin@edualto.vn',
        '$2a$10$8/HbXTdva9/yU9fAFj6c1.mlFfUjjXPOXe2s2Xslh14CvAjpSnqKO',
        'ACTIVE',
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET 
        password_hash = '$2a$10$8/HbXTdva9/yU9fAFj6c1.mlFfUjjXPOXe2s2Xslh14CvAjpSnqKO',
        status = 'ACTIVE',
        updated_at = NOW()
    RETURNING id INTO v_user_id;

    INSERT INTO user_roles (user_id, role_id)
    SELECT v_user_id, id FROM roles WHERE name IN ('ADMIN', 'INSTRUCTOR', 'STUDENT')
    ON CONFLICT DO NOTHING;

    INSERT INTO profiles (user_id, headline, bio, language, created_at, updated_at)
    VALUES (v_user_id, 'Quản trị viên nền tảng EduAlto', 'Tài khoản quản trị điều hành hệ thống.', 'vi', NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW();

    INSERT INTO instructor_profiles (user_id, expertise, created_at, updated_at)
    VALUES (v_user_id, 'Công nghệ thông tin & Giáo dục trực tuyến', NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW();

    INSERT INTO student_profiles (user_id, learning_goal, occupation, created_at, updated_at)
    VALUES (v_user_id, 'Quản trị toàn diện hệ thống EduAlto', 'System Administrator', NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW();
END $$;
