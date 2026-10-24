-- V31: Initialize Dynamic RBAC Permissions and Roles Permissions table

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    api_path VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_permissions_api_path_method UNIQUE (api_path, method),
    CONSTRAINT chk_permissions_method CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE'))
);

CREATE TABLE IF NOT EXISTS roles_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_roles_permissions PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_roles_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_roles_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_roles_permissions_role_id ON roles_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_roles_permissions_permission_id ON roles_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

-- Seed System Permissions
INSERT INTO permissions (name, api_path, method, module, description)
VALUES
    -- ========================================================
    -- 1. ADMIN MODULE (Quản trị hệ thống)
    -- ========================================================
    ('VIEW_ADMIN_DASHBOARD', '/api/v1/admin/dashboard/**', 'GET', 'ADMIN', 'Xem số liệu tổng quan hệ thống và thẻ KPI'),
    ('VIEW_ADMIN_ANALYTICS', '/api/v1/admin/dashboard/analytics', 'GET', 'ADMIN', 'Xem báo cáo thống kê doanh thu và phân tích chuyên sâu'),
    ('VIEW_ADMIN_USERS', '/api/v1/admin/users', 'GET', 'ADMIN', 'Xem danh sách người dùng và giảng viên toàn hệ thống'),
    ('CREATE_ADMIN_USER', '/api/v1/admin/users', 'POST', 'ADMIN', 'Tạo tài khoản người dùng mới từ trang quản trị'),
    ('UPDATE_USER_ROLES', '/api/v1/admin/users/*/roles', 'PATCH', 'ADMIN', 'Cấp và điều chỉnh vai trò cho người dùng'),
    ('UPDATE_USER_STATUS', '/api/v1/admin/users/*/status', 'PATCH', 'ADMIN', 'Khóa hoặc mở khóa trạng thái tài khoản'),
    ('RESET_USER_PASSWORD', '/api/v1/admin/users/*/reset-password', 'POST', 'ADMIN', 'Đặt lại mật khẩu cho tài khoản người dùng'),
    ('VIEW_ADMIN_COURSES', '/api/v1/admin/courses/**', 'GET', 'ADMIN', 'Xem danh sách khóa học toàn hệ thống để kiểm duyệt'),
    ('MODERATE_COURSES', '/api/v1/admin/courses/**', 'PATCH', 'ADMIN', 'Phê duyệt hoặc từ chối xuất bản khóa học'),
    ('VIEW_ADMIN_ROLES', '/api/v1/admin/roles/**', 'GET', 'ADMIN', 'Xem danh sách vai trò và cấu hình quyền hạn (RBAC)'),
    ('UPDATE_ADMIN_ROLES', '/api/v1/admin/roles/**', 'PUT', 'ADMIN', 'Cập nhật phân quyền chi tiết cho vai trò'),
    ('VIEW_ADMIN_PERMISSIONS', '/api/v1/admin/permissions/**', 'GET', 'ADMIN', 'Xem danh mục toàn bộ quyền hạn trong hệ thống'),
    ('VIEW_ADMIN_PAYMENTS', '/api/v1/admin/commerce/**', 'GET', 'ADMIN', 'Xem danh sách đối soát thanh toán và lịch sử giao dịch'),
    ('MANAGE_ADMIN_ORDERS', '/api/v1/admin/orders/**', 'POST', 'ADMIN', 'Xác nhận thanh toán thủ công và phê duyệt đơn hàng'),

    -- ========================================================
    -- 2. INSTRUCTOR MODULE (Giảng viên & Quản lý đào tạo)
    -- ========================================================
    ('VIEW_INSTRUCTOR_COURSES', '/api/v1/instructor/courses/**', 'GET', 'INSTRUCTOR', 'Xem danh sách khóa học của giảng viên'),
    ('CREATE_INSTRUCTOR_COURSE', '/api/v1/instructor/courses/**', 'POST', 'INSTRUCTOR', 'Tạo mới khóa học, chương và bài học'),
    ('UPDATE_INSTRUCTOR_COURSE', '/api/v1/instructor/courses/**', 'PUT', 'INSTRUCTOR', 'Cập nhật nội dung khóa học, bài học và tài liệu'),
    ('PATCH_INSTRUCTOR_COURSE', '/api/v1/instructor/courses/**', 'PATCH', 'INSTRUCTOR', 'Cập nhật trạng thái xuất bản hoặc chỉnh sửa nhanh khóa học'),
    ('DELETE_INSTRUCTOR_COURSE', '/api/v1/instructor/courses/**', 'DELETE', 'INSTRUCTOR', 'Xóa khóa học, bài học hoặc tài liệu giảng dạy'),
    ('IMPORT_CURRICULUM', '/api/v1/instructor/courses/*/curriculum-imports/**', 'POST', 'INSTRUCTOR', 'Nhập tự động giáo trình bài học bằng AI'),
    ('GENERATE_QUIZ_QUESTIONS', '/api/v1/instructor/quiz-question-generations/**', 'POST', 'INSTRUCTOR', 'Tạo bộ câu hỏi trắc nghiệm tự động bằng AI'),
    ('VIEW_INSTRUCTOR_QUIZZES', '/api/v1/instructor/lessons/*/quiz', 'GET', 'INSTRUCTOR', 'Xem nội dung bài kiểm tra trắc nghiệm để chỉnh sửa'),
    ('MANAGE_INSTRUCTOR_QUIZZES', '/api/v1/instructor/lessons/*/quiz', 'POST', 'INSTRUCTOR', 'Thiết lập bài kiểm tra trắc nghiệm cho bài học'),
    ('UPDATE_INSTRUCTOR_QUIZZES', '/api/v1/instructor/lessons/*/quiz', 'PUT', 'INSTRUCTOR', 'Cập nhật câu hỏi và đáp án bài kiểm tra'),
    ('VIEW_INSTRUCTOR_ANALYTICS', '/api/v1/instructor/analytics/**', 'GET', 'INSTRUCTOR', 'Xem thống kê tiến độ học viên theo khóa học'),
    ('VIEW_INSTRUCTOR_REVENUE', '/api/v1/instructor/revenue/**', 'GET', 'INSTRUCTOR', 'Xem doanh thu và yêu cầu quyết toán của giảng viên'),
    ('VIEW_INSTRUCTOR_PROMOTIONS', '/api/v1/instructor/promotions/**', 'GET', 'INSTRUCTOR', 'Xem danh sách mã giảm giá của giảng viên'),
    ('MANAGE_INSTRUCTOR_PROMOTIONS', '/api/v1/instructor/promotions/**', 'POST', 'INSTRUCTOR', 'Tạo mã giảm giá khuyến mãi cho khóa học'),
    ('PATCH_INSTRUCTOR_PROMOTIONS', '/api/v1/instructor/promotions/**', 'PATCH', 'INSTRUCTOR', 'Bật hoặc tắt mã giảm giá khuyến mãi'),
    ('VIEW_INSTRUCTOR_ASSIGNMENTS', '/api/v1/instructor/assignments/**', 'GET', 'INSTRUCTOR', 'Xem bài tập và danh sách bài nộp của học viên'),
    ('MANAGE_INSTRUCTOR_ASSIGNMENTS', '/api/v1/instructor/assignments/**', 'POST', 'INSTRUCTOR', 'Tạo bài tập thực hành và chấm điểm học viên'),
    ('UPDATE_INSTRUCTOR_ASSIGNMENTS', '/api/v1/instructor/assignments/**', 'PUT', 'INSTRUCTOR', 'Chỉnh sửa nội dung bài tập đã tạo'),
    ('DELETE_INSTRUCTOR_ASSIGNMENTS', '/api/v1/instructor/assignments/**', 'DELETE', 'INSTRUCTOR', 'Xóa bài tập thực hành'),
    ('VIEW_INSTRUCTOR_ENROLLMENTS', '/api/v1/instructor/enrollments/**', 'GET', 'INSTRUCTOR', 'Xem danh sách học viên đăng ký khóa học'),
    ('VIEW_INSTRUCTOR_REVIEWS', '/api/v1/instructor/courses/*/reviews', 'GET', 'INSTRUCTOR', 'Xem phản hồi và đánh giá từ học viên'),
    ('REPLY_INSTRUCTOR_REVIEWS', '/api/v1/instructor/courses/*/reviews/*/reply', 'PUT', 'INSTRUCTOR', 'Phản hồi nhận xét đánh giá của học viên'),
    ('DELETE_INSTRUCTOR_REVIEWS', '/api/v1/instructor/courses/*/reviews/*/reply', 'DELETE', 'INSTRUCTOR', 'Xóa phản hồi nhận xét đánh giá'),
    ('SET_REVIEW_VISIBILITY', '/api/v1/instructor/courses/*/reviews/*/visibility', 'PUT', 'INSTRUCTOR', 'Ẩn hoặc công khai nhận xét đánh giá'),
    ('VIEW_INSTRUCTOR_NOTIFICATIONS', '/api/v1/instructor/notifications/**', 'GET', 'INSTRUCTOR', 'Xem thông báo gửi cho giảng viên'),
    ('MANAGE_INSTRUCTOR_NOTIFICATIONS', '/api/v1/instructor/notifications/**', 'POST', 'INSTRUCTOR', 'Gửi thông báo tới toàn thể học viên trong khóa học'),
    ('VIEW_INSTRUCTOR_MESSAGES', '/api/v1/instructor/conversations/**', 'GET', 'INSTRUCTOR', 'Xem hộp thư trao đổi tin nhắn với học viên'),
    ('SEND_INSTRUCTOR_MESSAGES', '/api/v1/instructor/conversations/**', 'POST', 'INSTRUCTOR', 'Gửi tin nhắn phản hồi hỏi đáp cho học viên'),
    ('BLOCK_INSTRUCTOR_MESSAGES', '/api/v1/instructor/conversations/*/block', 'PUT', 'INSTRUCTOR', 'Chặn tin nhắn làm phiền từ người dùng'),

    -- ========================================================
    -- 3. STUDENT MODULE (Học tập & Học viên)
    -- ========================================================
    ('VIEW_LEARNING_CONTENT', '/api/v1/lessons/**', 'GET', 'STUDENT', 'Xem nội dung bài học, bài giảng và tài nguyên đính kèm'),
    ('COMPLETE_LESSON_PROGRESS', '/api/v1/lessons/*/complete', 'POST', 'STUDENT', 'Đánh dấu hoàn thành bài học'),
    ('VIEW_LESSON_QUIZ', '/api/v1/lessons/*/quiz', 'GET', 'STUDENT', 'Xem thông tin đề kiểm tra trước khi làm'),
    ('START_LESSON_QUIZ', '/api/v1/lessons/*/quiz-sessions', 'POST', 'STUDENT', 'Bắt đầu phiên làm bài kiểm tra trắc nghiệm'),
    ('SUBMIT_LESSON_QUIZ', '/api/v1/lessons/*/quiz-attempts', 'POST', 'STUDENT', 'Nộp bài kiểm tra và nhận điểm số đánh giá'),
    ('VIEW_STUDENT_ASSIGNMENTS', '/api/v1/me/assignments', 'GET', 'STUDENT', 'Xem danh sách bài tập được giao'),
    ('SUBMIT_STUDENT_ASSIGNMENT', '/api/v1/assignments/**/submissions', 'POST', 'STUDENT', 'Nộp bài tập thực hành cho giảng viên'),
    ('UPDATE_STUDENT_ASSIGNMENT', '/api/v1/assignments/**/submissions/**', 'PUT', 'STUDENT', 'Cập nhật bài làm bài tập thực hành'),
    ('VIEW_STUDENT_ENROLLMENTS', '/api/v1/me/enrollments', 'GET', 'STUDENT', 'Xem danh sách các khóa học đã ghi danh'),
    ('ENROLL_COURSE', '/api/v1/courses/*/enrollments', 'POST', 'STUDENT', 'Đăng ký tham gia khóa học'),
    ('VIEW_COURSE_PROGRESS', '/api/v1/me/courses/*/progress', 'GET', 'STUDENT', 'Theo dõi phần trăm tiến độ hoàn thành khóa học'),
    ('VIEW_OWN_REVIEW', '/api/v1/me/courses/*/review', 'GET', 'STUDENT', 'Xem đánh giá cá nhân đã gửi cho khóa học'),
    ('SUBMIT_COURSE_REVIEW', '/api/v1/me/courses/*/review', 'PUT', 'STUDENT', 'Gửi và cập nhật đánh giá nhận xét khóa học'),
    ('VIEW_COURSE_CERTIFICATES', '/api/v1/me/certificates', 'GET', 'STUDENT', 'Xem danh sách chứng nhận hoàn thành khóa học'),
    ('VIEW_STUDENT_NOTES', '/api/v1/me/notes', 'GET', 'STUDENT', 'Xem ghi chú cá nhân trong bài giảng'),
    ('CREATE_STUDENT_NOTE', '/api/v1/me/notes', 'POST', 'STUDENT', 'Tạo ghi chú học tập tại mốc thời gian video'),
    ('UPDATE_STUDENT_NOTE', '/api/v1/me/notes/**', 'PUT', 'STUDENT', 'Chỉnh sửa ghi chú học tập'),
    ('DELETE_STUDENT_NOTE', '/api/v1/me/notes/**', 'DELETE', 'STUDENT', 'Xóa ghi chú học tập'),
    ('VIEW_SAVED_LESSONS', '/api/v1/me/saved-lessons', 'GET', 'STUDENT', 'Xem danh sách bài học đã đánh dấu lưu'),
    ('SAVE_LESSON', '/api/v1/me/saved-lessons/**', 'PUT', 'STUDENT', 'Lưu bài học để xem lại sau'),
    ('DELETE_SAVED_LESSON', '/api/v1/me/saved-lessons/**', 'DELETE', 'STUDENT', 'Bỏ lưu bài học'),
    ('VIEW_SAVED_RESOURCES', '/api/v1/me/saved-resources', 'GET', 'STUDENT', 'Xem danh sách tài liệu bài học đã lưu'),
    ('SAVE_RESOURCE', '/api/v1/me/saved-resources/**', 'PUT', 'STUDENT', 'Lưu tài liệu bài học'),
    ('DELETE_SAVED_RESOURCE', '/api/v1/me/saved-resources/**', 'DELETE', 'STUDENT', 'Bỏ lưu tài liệu bài học'),
    ('VIEW_FAVORITE_COURSES', '/api/v1/me/favorite-courses', 'GET', 'STUDENT', 'Xem danh sách khóa học yêu thích'),
    ('SAVE_FAVORITE_COURSE', '/api/v1/me/favorite-courses/**', 'PUT', 'STUDENT', 'Thêm khóa học vào danh sách yêu thích'),
    ('DELETE_FAVORITE_COURSE', '/api/v1/me/favorite-courses/**', 'DELETE', 'STUDENT', 'Bỏ thích khóa học'),
    ('VIEW_STUDENT_ORDERS', '/api/v1/me/orders/**', 'GET', 'STUDENT', 'Xem lịch sử mua hàng và hóa đơn đơn hàng'),
    ('CREATE_STUDENT_ORDER', '/api/v1/me/orders', 'POST', 'STUDENT', 'Tạo đơn hàng thanh toán khóa học'),
    ('CANCEL_STUDENT_ORDER', '/api/v1/me/orders/*/cancel', 'POST', 'STUDENT', 'Hủy đơn hàng đang chờ thanh toán'),
    ('VIEW_STUDENT_MESSAGES', '/api/v1/me/conversations/**', 'GET', 'STUDENT', 'Xem hộp thư tin nhắn hỏi đáp với giảng viên'),
    ('SEND_STUDENT_MESSAGE', '/api/v1/me/conversations/**', 'POST', 'STUDENT', 'Gửi tin nhắn hỏi đáp cho giảng viên'),
    ('START_STUDENT_CONVERSATION', '/api/v1/me/instructors/*/conversations', 'POST', 'STUDENT', 'Bắt đầu cuộc trò chuyện mới với giảng viên'),
    ('VIEW_STUDENT_NOTIFICATIONS', '/api/v1/me/notifications', 'GET', 'STUDENT', 'Nhận thông báo cập nhật từ hệ thống và khóa học'),
    ('VIEW_INSTRUCTOR_ANNOUNCEMENTS', '/api/v1/me/instructor-announcements', 'GET', 'STUDENT', 'Xem thông báo chung từ giảng viên các khóa học đã ghi danh')
ON CONFLICT (api_path, method) DO UPDATE SET 
    name = EXCLUDED.name,
    module = EXCLUDED.module,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- ========================================================
-- PHÂN QUYỀN SẴN CHO TỪNG VAI TRÒ (SEED ROLES_PERMISSIONS)
-- ========================================================

-- 1. ROLE_ADMIN: Nhận 100% tất cả các quyền trong hệ thống
INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2. ROLE_INSTRUCTOR: Nhận toàn bộ quyền Giảng viên (INSTRUCTOR) + quyền Học tập/Xem nội dung (STUDENT)
INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'INSTRUCTOR' 
  AND (p.module = 'INSTRUCTOR' OR p.module = 'STUDENT')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. ROLE_STUDENT: Nhận toàn bộ quyền Học tập & Tương tác (STUDENT)
INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'STUDENT' 
  AND p.module = 'STUDENT'
ON CONFLICT (role_id, permission_id) DO NOTHING;
