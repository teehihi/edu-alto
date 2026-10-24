BEGIN;

-- 1. Roles
UPDATE roles SET description = 'Quản trị viên hệ thống' WHERE name = 'ADMIN';
UPDATE roles SET description = 'Giảng viên' WHERE name = 'INSTRUCTOR';
UPDATE roles SET description = 'Học viên' WHERE name = 'STUDENT';

-- 2. Users Full Names
UPDATE users SET full_name = 'Quản trị viên EduAlto' WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE users SET full_name = 'Nguyễn Minh Anh' WHERE id = 'd47bcfaf-69ca-494f-bc17-4c4b7620f102';
UPDATE users SET full_name = 'ThS. Nguyễn Văn Dũng' WHERE id = 'e1000000-0000-0000-0000-000000000001';
UPDATE users SET full_name = 'Trần Mai Anh' WHERE id = 'e1000000-0000-0000-0000-000000000002';
UPDATE users SET full_name = 'Lê Hoàng Phúc' WHERE id = 'e1000000-0000-0000-0000-000000000003';
UPDATE users SET full_name = 'Phạm Minh Tuấn' WHERE id = 'e2000000-0000-0000-0000-000000000001';
UPDATE users SET full_name = 'Nguyễn Thị Phương Thảo' WHERE id = 'e2000000-0000-0000-0000-000000000002';
UPDATE users SET full_name = 'Võ Quốc Bảo' WHERE id = 'e2000000-0000-0000-0000-000000000003';
UPDATE users SET full_name = 'Hoàng Gia Huy' WHERE id = 'e2000000-0000-0000-0000-000000000004';

-- 3. Profiles (Headlines & Bios)
INSERT INTO profiles (user_id, headline, bio, language, created_at, updated_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Quản trị viên nền tảng EduAlto', 'Tài khoản quản trị điều hành hệ thống.', 'vi', NOW(), NOW()),
    ('d47bcfaf-69ca-494f-bc17-4c4b7620f102', 'Giảng viên lập trình Python', 'Chia sẻ kiến thức lập trình thực tế theo lộ trình dễ tiếp cận cho người mới bắt đầu.', 'vi', NOW(), NOW()),
    ('e1000000-0000-0000-0000-000000000001', 'Chuyên gia Fullstack & Kiến trúc sư Phần mềm', 'Hơn 10 năm kinh nghiệm phát triển hệ sinh thái ứng dụng với Next.js và Spring Boot.', 'vi', NOW(), NOW()),
    ('e1000000-0000-0000-0000-000000000002', 'Senior Product Designer', 'Chuyên gia thiết kế Design System và tối ưu trải nghiệm người dùng số.', 'vi', NOW(), NOW()),
    ('e1000000-0000-0000-0000-000000000003', 'Database Specialist & Cloud Architect', 'Nghiên cứu và tối ưu hóa hệ quản trị cơ sở dữ liệu phân tán PostgreSQL.', 'vi', NOW(), NOW()),
    ('e2000000-0000-0000-0000-000000000001', 'Học viên Web Fullstack', 'Đang theo học lộ trình Fullstack Developer.', 'vi', NOW(), NOW()),
    ('e2000000-0000-0000-0000-000000000002', 'Học viên UI/UX Design', 'Đam mê thiết kế giao diện và trải nghiệm ứng dụng.', 'vi', NOW(), NOW()),
    ('e2000000-0000-0000-0000-000000000003', 'Học viên Kỹ thuật Dữ liệu', 'Yêu thích cơ sở dữ liệu và phân tích hiệu năng.', 'vi', NOW(), NOW()),
    ('e2000000-0000-0000-0000-000000000004', 'Học viên Lập trình viên mới', 'Bắt đầu hành trình học tập công nghệ thông tin.', 'vi', NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET 
    headline = EXCLUDED.headline,
    bio = EXCLUDED.bio,
    updated_at = NOW();

-- 4. Courses (Title, Tagline, Description)
UPDATE courses SET
    title = 'Lập trình Python cơ bản cho người mới bắt đầu',
    tagline = 'Học tư duy lập trình và tự viết chương trình Python đầu tiên',
    description = 'Khóa học giúp bạn bắt đầu lập trình từ con số không. Bạn sẽ làm quen với cú pháp Python, biến và kiểu dữ liệu, câu lệnh điều kiện, vòng lặp và cách chia bài toán thành từng bước nhỏ.'
WHERE id = 'd47bcfaf-69ca-494f-bc17-4c4b7620f103';

UPDATE courses SET
    title = 'Lập trình Web Fullstack với Next.js & Spring Boot',
    tagline = 'Xây dựng ứng dụng hoàn chỉnh từ giao diện hiện đại đến backend chuẩn doanh nghiệp',
    description = 'Khóa học thực chiến toàn diện giúp bạn làm chủ Next.js 16, React 19, Spring Boot 4, Docker và PostgreSQL.'
WHERE id = 'c1000000-0000-0000-0000-000000000001';

UPDATE courses SET
    title = 'Thiết kế UI/UX Chuyên nghiệp từ Figma đến Sản phẩm',
    tagline = 'Tư duy thiết kế trải nghiệm người dùng, xây dựng Design System và Prototype nâng cao',
    description = 'Thành thạo công cụ Figma, quy chuẩn Design Tokens, Layout responsive và phối hợp hiệu quả với lập trình viên.'
WHERE id = 'c1000000-0000-0000-0000-000000000002';

UPDATE courses SET
    title = 'Tối ưu hóa Cơ sở dữ liệu PostgreSQL cho Hệ thống lớn',
    tagline = 'Index, Query Plan, Partitioning và kỹ thuật xử lý dữ liệu tải cao',
    description = 'Làm chủ kiến trúc PostgreSQL, phân tích EXPLAIN ANALYZE và tối ưu hóa truy vấn chuyên sâu.'
WHERE id = 'c1000000-0000-0000-0000-000000000003';

UPDATE courses SET
    title = 'Triển khai Microservices & Kubernetes Thực chiến',
    tagline = 'Đang hoàn thiện nội dung giáo trình bài giảng',
    description = 'Khóa học bản nháp chuẩn bị ra mắt vào quý tới.'
WHERE id = 'c1000000-0000-0000-0000-000000000004';

-- 5. Sections
UPDATE sections SET title = 'Bắt đầu với Python', description = 'Chuẩn bị công cụ và làm quen với dữ liệu.' WHERE id = 'd47bcfaf-69ca-494f-bc17-4c4b7620f104';
UPDATE sections SET title = 'Điều khiển và thực hành', description = 'Dùng điều kiện, vòng lặp để giải quyết bài toán nhỏ.' WHERE id = 'd47bcfaf-69ca-494f-bc17-4c4b7620f105';
UPDATE sections SET title = 'Phần 1: Khởi động & Kiến trúc Monolith' WHERE id = 'a1000000-0000-0000-0000-000000000001';
UPDATE sections SET title = 'Phần 2: Xây dựng Backend Spring Boot API' WHERE id = 'a1000000-0000-0000-0000-000000000002';
UPDATE sections SET title = 'Phần 1: Nguyên lý thiết kế & Màu sắc' WHERE id = 'a1000000-0000-0000-0000-000000000003';

-- 6. Lessons
UPDATE lessons SET title = 'Chào mừng và cài đặt Python' WHERE id = 'd47bcfaf-69ca-494f-bc17-4c4b7620f106';
UPDATE lessons SET title = 'Biến và kiểu dữ liệu' WHERE id = 'd47bcfaf-69ca-494f-bc17-4c4b7620f107';
UPDATE lessons SET title = 'Dự án: quản lý chi tiêu cá nhân' WHERE id = 'd47bcfaf-69ca-494f-bc17-4c4b7620f108';
UPDATE lessons SET title = 'Giới thiệu tổng quan hệ thống EduAlto' WHERE id = 'a2000000-0000-0000-0000-000000000001';
UPDATE lessons SET title = 'Cài đặt môi trường Docker & PostgreSQL' WHERE id = 'a2000000-0000-0000-0000-000000000002';
UPDATE lessons SET title = 'Thiết kế RESTful API chuẩn Spring Boot' WHERE id = 'a2000000-0000-0000-0000-000000000003';
UPDATE lessons SET title = 'Tâm lý học thị giác trong UI Design' WHERE id = 'a2000000-0000-0000-0000-000000000004';

-- 7. Course Reviews
UPDATE course_reviews SET comment = 'Khóa học cực kỳ chi tiết và thực tế! Thầy giảng rất dễ hiểu.' WHERE id = 'a7000000-0000-0000-0000-000000000001';
UPDATE course_reviews SET comment = 'Học xong áp dụng được ngay vào công việc thiết kế của mình.' WHERE id = 'a7000000-0000-0000-0000-000000000002';
UPDATE course_reviews SET comment = 'Kiến thức nâng cao và rất chuyên sâu về PostgreSQL.' WHERE id = 'a7000000-0000-0000-0000-000000000003';

-- 8. Order Items
UPDATE order_items SET course_title = 'Lập trình Web Fullstack với Next.js & Spring Boot' WHERE course_id = 'c1000000-0000-0000-0000-000000000001';
UPDATE order_items SET course_title = 'Thiết kế UI/UX Chuyên nghiệp từ Figma đến Sản phẩm' WHERE course_id = 'c1000000-0000-0000-0000-000000000002';
UPDATE order_items SET course_title = 'Tối ưu hóa Cơ sở dữ liệu PostgreSQL cho Hệ thống lớn' WHERE course_id = 'c1000000-0000-0000-0000-000000000003';
UPDATE order_items SET course_title = 'Lập trình Python cơ bản cho người mới bắt đầu' WHERE course_id = 'd47bcfaf-69ca-494f-bc17-4c4b7620f103';

COMMIT;
