UPDATE users SET full_name = 'ThS. Nguyễn Văn Dũng' WHERE id = 'e1000000-0000-0000-0000-000000000001';
UPDATE users SET full_name = 'Trần Mai Anh' WHERE id = 'e1000000-0000-0000-0000-000000000002';
UPDATE users SET full_name = 'Lê Hoàng Phúc' WHERE id = 'e1000000-0000-0000-0000-000000000003';
UPDATE users SET full_name = 'Phạm Minh Tuấn' WHERE id = 'e2000000-0000-0000-0000-000000000001';
UPDATE users SET full_name = 'Nguyễn Thị Phương Thảo' WHERE id = 'e2000000-0000-0000-0000-000000000002';
UPDATE users SET full_name = 'Võ Quốc Bảo' WHERE id = 'e2000000-0000-0000-0000-000000000003';
UPDATE users SET full_name = 'Hoàng Gia Huy' WHERE id = 'e2000000-0000-0000-0000-000000000004';
UPDATE users SET full_name = 'Nguyễn Minh Anh' WHERE id = 'd47bcfaf-69ca-494f-bc17-4c4b7620f102';
UPDATE users SET full_name = 'Quản trị viên EduAlto' WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE courses SET title = 'Lập trình Web Fullstack với Next.js & Spring Boot' WHERE id = 'c1000000-0000-0000-0000-000000000001';
UPDATE courses SET title = 'Thiết kế UI/UX Chuyên nghiệp từ Figma đến Sản phẩm' WHERE id = 'c1000000-0000-0000-0000-000000000002';
UPDATE courses SET title = 'Tối ưu hóa Cơ sở dữ liệu PostgreSQL cho Hệ thống lớn' WHERE id = 'c1000000-0000-0000-0000-000000000003';
UPDATE courses SET title = 'Triển khai Microservices & Kubernetes Thực chiến' WHERE id = 'c1000000-0000-0000-0000-000000000004';
UPDATE courses SET title = 'Lập trình Python cơ bản cho người mới bắt đầu' WHERE id = 'd47bcfaf-69ca-494f-bc17-4c4b7620f103';

UPDATE order_items SET course_title = 'Lập trình Web Fullstack với Next.js & Spring Boot' WHERE course_id = 'c1000000-0000-0000-0000-000000000001';
UPDATE order_items SET course_title = 'Thiết kế UI/UX Chuyên nghiệp từ Figma đến Sản phẩm' WHERE course_id = 'c1000000-0000-0000-0000-000000000002';
UPDATE order_items SET course_title = 'Tối ưu hóa Cơ sở dữ liệu PostgreSQL cho Hệ thống lớn' WHERE course_id = 'c1000000-0000-0000-0000-000000000003';
UPDATE order_items SET course_title = 'Lập trình Python cơ bản cho người mới bắt đầu' WHERE course_id = 'd47bcfaf-69ca-494f-bc17-4c4b7620f103';
