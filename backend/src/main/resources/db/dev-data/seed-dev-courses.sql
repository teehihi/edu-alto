-- Real data seeding for EduAlto LMS in DEV/LOCAL environment
-- This script is executed ONLY when SPRING_PROFILES_ACTIVE is dev or local,
-- and ONLY if the courses table is empty on startup.

-- 1. Create Instructors
INSERT INTO users (id, full_name, email, password_hash, status, email_verified_at, created_at, updated_at)
VALUES 
    ('e1000000-0000-0000-0000-000000000001', 'ThS. Nguyễn Văn Dũng', 'dung.nguyen@edualto.edu.vn', '$2a$10$8/HbXTdva9/yU9fAFj6c1.mlFfUjjXPOXe2s2Xslh14CvAjpSnqKO', 'ACTIVE', NOW(), NOW() - interval '180 days', NOW()),
    ('e1000000-0000-0000-0000-000000000002', 'Trần Mai Anh', 'maianh.tran@edualto.edu.vn', '$2a$10$8/HbXTdva9/yU9fAFj6c1.mlFfUjjXPOXe2s2Xslh14CvAjpSnqKO', 'ACTIVE', NOW(), NOW() - interval '150 days', NOW()),
    ('e1000000-0000-0000-0000-000000000003', 'Lê Hoàng Phúc', 'phuc.le@edualto.edu.vn', '$2a$10$8/HbXTdva9/yU9fAFj6c1.mlFfUjjXPOXe2s2Xslh14CvAjpSnqKO', 'ACTIVE', NOW(), NOW() - interval '120 days', NOW())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, status = 'ACTIVE';

-- Assign INSTRUCTOR roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r 
WHERE u.id IN ('e1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000003')
  AND r.name = 'INSTRUCTOR'
ON CONFLICT DO NOTHING;

-- Instructor Profiles
INSERT INTO instructor_profiles (user_id, expertise, experience_years, teaching_experience, qualification_summary, specialties, verified_at, created_at, updated_at)
VALUES 
    ('e1000000-0000-0000-0000-000000000001', 'Chuyên gia Fullstack & Cloud Architecture', 10, 'Giảng dạy tại các trường đại học và đào tạo doanh nghiệp hơn 8 năm.', 'Thạc sĩ Khoa học Máy tính, AWS Certified Solutions Architect', 'Spring Boot, Next.js, Cloud, Microservices', NOW(), NOW(), NOW()),
    ('e1000000-0000-0000-0000-000000000002', 'Senior Product Designer & Design System', 7, 'Lead UI/UX Designer tại nhiều dự án công nghệ lớn.', 'Cử nhân Thiết kế Đồ họa, Figma Community Advocate', 'UI/UX, Design Systems, UX Research, Prototyping', NOW(), NOW(), NOW()),
    ('e1000000-0000-0000-0000-000000000003', 'Database Architect & High Performance Systems', 12, 'Tư vấn kiến trúc cơ sở dữ liệu và tối ưu hiệu năng cao.', 'Kỹ sư Phần mềm, PostgreSQL Certified Professional', 'PostgreSQL, Database Tuning, Query Optimization, High Availability', NOW(), NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET expertise = EXCLUDED.expertise;

-- Instructor Base Profiles
INSERT INTO profiles (user_id, headline, bio, language, created_at, updated_at)
VALUES 
    ('e1000000-0000-0000-0000-000000000001', 'Giảng viên cấp cao & Cloud Architect', 'Hơn 10 năm kinh nghiệm kiến trúc phần mềm phân tán và đào tạo kỹ sư công nghệ.', 'vi', NOW(), NOW()),
    ('e1000000-0000-0000-0000-000000000002', 'Senior Product Designer', 'Đam mê xây dựng trải nghiệm người dùng tối ưu và hệ thống Design System mạch lạc.', 'vi', NOW(), NOW()),
    ('e1000000-0000-0000-0000-000000000003', 'Kỹ sư trưởng Kiến trúc Dữ liệu', 'Chuyên sâu giải quyết bài toán tải lớn, chỉ mục và hiệu năng cơ sở dữ liệu quan hệ.', 'vi', NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET headline = EXCLUDED.headline, bio = EXCLUDED.bio, updated_at = NOW();

-- 2. Create Students
INSERT INTO users (id, full_name, email, password_hash, status, email_verified_at, created_at, updated_at)
VALUES 
    ('e2000000-0000-0000-0000-000000000001', 'Phạm Minh Tuấn', 'tuan.pham@gmail.com', '$2a$10$8/HbXTdva9/yU9fAFj6c1.mlFfUjjXPOXe2s2Xslh14CvAjpSnqKO', 'ACTIVE', NOW(), NOW() - interval '90 days', NOW()),
    ('e2000000-0000-0000-0000-000000000002', 'Nguyễn Thị Phương Thảo', 'thao.nguyen@gmail.com', '$2a$10$8/HbXTdva9/yU9fAFj6c1.mlFfUjjXPOXe2s2Xslh14CvAjpSnqKO', 'ACTIVE', NOW(), NOW() - interval '60 days', NOW()),
    ('e2000000-0000-0000-0000-000000000003', 'Võ Quốc Bảo', 'bao.vo@gmail.com', '$2a$10$8/HbXTdva9/yU9fAFj6c1.mlFfUjjXPOXe2s2Xslh14CvAjpSnqKO', 'ACTIVE', NOW(), NOW() - interval '30 days', NOW()),
    ('e2000000-0000-0000-0000-000000000004', 'Hoàng Gia Huy', 'huy.hoang@gmail.com', '$2a$10$8/HbXTdva9/yU9fAFj6c1.mlFfUjjXPOXe2s2Xslh14CvAjpSnqKO', 'PENDING_VERIFICATION', null, NOW() - interval '2 days', NOW())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Assign STUDENT roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r 
WHERE u.id IN ('e2000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000003', 'e2000000-0000-0000-0000-000000000004')
  AND r.name = 'STUDENT'
ON CONFLICT DO NOTHING;

-- Student Base Profiles & Learning Goals
INSERT INTO profiles (user_id, headline, bio, language, created_at, updated_at)
VALUES 
    ('e2000000-0000-0000-0000-000000000001', 'Software Engineer @ TechVN', 'Yêu thích lập trình web và công nghệ đám mây.', 'vi', NOW(), NOW()),
    ('e2000000-0000-0000-0000-000000000002', 'Junior UI Designer', 'Đang chuyển hướng phát triển sự nghiệp sang Product Design.', 'vi', NOW(), NOW()),
    ('e2000000-0000-0000-0000-000000000003', 'Backend Developer', 'Muốn đào sâu tối ưu hóa cơ sở dữ liệu quy mô lớn.', 'vi', NOW(), NOW()),
    ('e2000000-0000-0000-0000-000000000004', 'Sinh viên Công nghệ Thông tin', 'Người mới bắt đầu tìm hiểu lập trình ứng dụng web.', 'vi', NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET headline = EXCLUDED.headline, bio = EXCLUDED.bio, updated_at = NOW();

INSERT INTO student_profiles (user_id, learning_goal, occupation, education_level, interests, created_at, updated_at)
VALUES 
    ('e2000000-0000-0000-0000-000000000001', 'Nâng cao năng lực Fullstack và kiến trúc microservices', 'Kỹ sư phần mềm', 'Đại học', 'Java, Spring Boot, React, Next.js', NOW(), NOW()),
    ('e2000000-0000-0000-0000-000000000002', 'Làm chủ Figma và xây dựng hoàn chỉnh một Design System', 'UI Designer', 'Đại học', 'Figma, UI/UX, Design Systems', NOW(), NOW()),
    ('e2000000-0000-0000-0000-000000000003', 'Thành thạo tối ưu hóa câu lệnh SQL và kiến trúc chỉ mục', 'Backend Developer', 'Đại học', 'PostgreSQL, Database Tuning, Linux', NOW(), NOW()),
    ('e2000000-0000-0000-0000-000000000004', 'Nắm vững kiến thức nền tảng về lập trình web', 'Sinh viên', 'Đại học', 'Web Development, JavaScript, Java', NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET learning_goal = EXCLUDED.learning_goal;

-- 3. Create Courses
INSERT INTO courses (id, instructor_id, title, slug, tagline, description, price, original_price, level, language, status, created_at, updated_at, published_at)
VALUES 
    (
        'c1000000-0000-0000-0000-000000000001',
        'e1000000-0000-0000-0000-000000000001',
        'Lập trình Web Fullstack với Next.js & Spring Boot',
        'lap-trinh-web-fullstack-nextjs-springboot',
        'Xây dựng ứng dụng hoàn chỉnh từ giao diện hiện đại đến backend chuẩn doanh nghiệp',
        'Khóa học thực chiến toàn diện giúp bạn làm chủ Next.js 16, React 19, Spring Boot 4, Docker và PostgreSQL.',
        599000, 1200000, 'INTERMEDIATE', 'vi', 'PUBLISHED', NOW() - interval '120 days', NOW(), NOW() - interval '110 days'
    ),
    (
        'c1000000-0000-0000-0000-000000000002',
        'e1000000-0000-0000-0000-000000000002',
        'Thiết kế UI/UX Chuyên nghiệp từ Figma đến Sản phẩm',
        'thiet-ke-uiux-chuyen-nghiep-figma',
        'Tư duy thiết kế trải nghiệm người dùng, xây dựng Design System và Prototype nâng cao',
        'Thành thạo công cụ Figma, quy chuẩn Design Tokens, Layout responsive và phối hợp hiệu quả với lập trình viên.',
        450000, 890000, 'BEGINNER', 'vi', 'PUBLISHED', NOW() - interval '90 days', NOW(), NOW() - interval '85 days'
    ),
    (
        'c1000000-0000-0000-0000-000000000003',
        'e1000000-0000-0000-0000-000000000003',
        'Tối ưu hóa Cơ sở dữ liệu PostgreSQL cho Hệ thống lớn',
        'toi-uu-hoa-database-postgresql',
        'Index, Query Plan, Partitioning và kỹ thuật xử lý dữ liệu tải cao',
        'Làm chủ kiến trúc PostgreSQL, phân tích EXPLAIN ANALYZE và tối ưu hóa truy vấn chuyên sâu.',
        690000, 1500000, 'ADVANCED', 'vi', 'PUBLISHED', NOW() - interval '60 days', NOW(), NOW() - interval '55 days'
    ),
    (
        'c1000000-0000-0000-0000-000000000004',
        'e1000000-0000-0000-0000-000000000001',
        'Triển khai Microservices & Kubernetes Thực chiến',
        'trien-khai-microservices-kubernetes',
        'Đang hoàn thiện nội dung giáo trình bài giảng',
        'Khóa học bản nháp chuẩn bị ra mắt vào quý tới.',
        790000, 1800000, 'ADVANCED', 'vi', 'DRAFT', NOW() - interval '10 days', NOW(), null
    )
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, price = EXCLUDED.price, status = EXCLUDED.status;

-- 4. Sections & Lessons for Courses
INSERT INTO sections (id, course_id, title, position, created_at, updated_at)
VALUES 
    ('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Phần 1: Khởi động & Kiến trúc Monolith', 1, NOW(), NOW()),
    ('a1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Phần 2: Xây dựng Backend Spring Boot API', 2, NOW(), NOW()),
    ('a1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 'Phần 1: Nguyên lý thiết kế & Màu sắc', 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO lessons (id, section_id, title, lesson_type, position, duration_seconds, is_preview, status, created_at, updated_at)
VALUES 
    ('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Giới thiệu tổng quan hệ thống EduAlto', 'VIDEO', 1, 480, true, 'PUBLISHED', NOW(), NOW()),
    ('a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Cài đặt môi trường Docker & PostgreSQL', 'VIDEO', 2, 720, false, 'PUBLISHED', NOW(), NOW()),
    ('a2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'Thiết kế RESTful API chuẩn Spring Boot', 'VIDEO', 1, 950, false, 'PUBLISHED', NOW(), NOW()),
    ('a2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003', 'Tâm lý học thị giác trong UI Design', 'VIDEO', 1, 600, true, 'PUBLISHED', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Create Enrollments
INSERT INTO enrollments (id, student_id, course_id, status, enrolled_at, created_at, updated_at)
VALUES 
    ('a3000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'ACTIVE', NOW() - interval '80 days', NOW(), NOW()),
    ('a3000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'ACTIVE', NOW() - interval '50 days', NOW(), NOW()),
    ('a3000000-0000-0000-0000-000000000003', 'e2000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'ACTIVE', NOW() - interval '20 days', NOW(), NOW())
ON CONFLICT (student_id, course_id) DO NOTHING;

-- 6. Create Orders & Payments
INSERT INTO orders (id, student_id, status, currency, subtotal, total, transfer_reference, created_at, updated_at)
VALUES 
    ('a4000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'PAID', 'VND', 599000, 599000, 'EAVQ89423184', NOW() - interval '80 days', NOW() - interval '80 days'),
    ('a4000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'PAID', 'VND', 450000, 450000, 'EAMM92817342', NOW() - interval '50 days', NOW() - interval '50 days'),
    ('a4000000-0000-0000-0000-000000000003', 'e2000000-0000-0000-0000-000000000003', 'PAID', 'VND', 690000, 690000, 'EAVN18472910', NOW() - interval '20 days', NOW() - interval '20 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (id, order_id, course_id, course_title, unit_price, list_price, created_at)
VALUES 
    ('a5000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Lập trình Web Fullstack với Next.js & Spring Boot', 599000, 599000, NOW() - interval '80 days'),
    ('a5000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'Thiết kế UI/UX Chuyên nghiệp từ Figma đến Sản phẩm', 450000, 450000, NOW() - interval '50 days'),
    ('a5000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'Tối ưu hóa Cơ sở dữ liệu PostgreSQL cho Hệ thống lớn', 690000, 690000, NOW() - interval '20 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, order_id, provider, provider_txn_ref, amount_minor_units, status, paid_at, created_at, updated_at)
VALUES 
    ('a6000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', 'VIETQR', 'TXN_VQ_894231', 599000, 'PAID', NOW() - interval '80 days', NOW() - interval '80 days', NOW() - interval '80 days'),
    ('a6000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000002', 'MOMO', 'TXN_MM_928173', 450000, 'PAID', NOW() - interval '50 days', NOW() - interval '50 days', NOW() - interval '50 days'),
    ('a6000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-000000000003', 'VNPAY', 'TXN_VN_184729', 690000, 'PAID', NOW() - interval '20 days', NOW() - interval '20 days', NOW() - interval '20 days')
ON CONFLICT (order_id) DO NOTHING;

-- 7. Course Reviews
INSERT INTO course_reviews (id, student_id, course_id, rating, comment, status, created_at, updated_at)
VALUES 
    ('a7000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 5, 'Khóa học cực kỳ chi tiết và thực tế! Thầy giảng rất dễ hiểu.', 'PUBLISHED', NOW() - interval '70 days', NOW()),
    ('a7000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 5, 'Học xong áp dụng được ngay vào công việc thiết kế của mình.', 'PUBLISHED', NOW() - interval '40 days', NOW()),
    ('a7000000-0000-0000-0000-000000000003', 'e2000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 4, 'Kiến thức nâng cao và rất chuyên sâu về PostgreSQL.', 'PUBLISHED', NOW() - interval '10 days', NOW())
ON CONFLICT (student_id, course_id) DO NOTHING;
