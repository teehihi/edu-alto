# Permission Matrix

Ma trận này là baseline cho authorization. Tên permission dùng English để phù hợp source code/database; mô tả dùng tiếng Việt.

## Roles

| Role | Mô tả |
| --- | --- |
| `GUEST` | Chưa đăng nhập, chỉ truy cập public content |
| `STUDENT` | Học viên đã xác thực email |
| `INSTRUCTOR` | Giảng viên quản lý khóa học của mình |
| `ADMIN` | Quản trị hệ thống |

## Permission keys

| Permission | Mô tả |
| --- | --- |
| `course:read_public` | Xem danh sách/chi tiết khóa học public |
| `course:manage_own` | Tạo, sửa, publish/unpublish khóa học của mình |
| `course:manage_all` | Quản lý mọi khóa học |
| `enrollment:create` | Ghi danh khóa học |
| `lesson:read_enrolled` | Xem bài học trong khóa đã ghi danh |
| `learning:update_own` | Cập nhật tiến độ của chính mình |
| `quiz:attempt` | Làm quiz |
| `assignment:submit` | Nộp bài tập |
| `assignment:grade_own_course` | Chấm bài trong course mình quản lý |
| `discussion:participate` | Tạo discussion/comment khi có quyền course |
| `message:participate` | Nhắn tin trong conversation mình tham gia |
| `notification:read_own` | Xem/cập nhật notification của mình |
| `admin:user_manage` | Quản lý user/role |
| `admin:system_config` | Quản lý cấu hình hệ thống |
| `analytics:read_own_course` | Xem analytics cho course mình quản lý |
| `analytics:read_all` | Xem analytics toàn hệ thống |
| `ai:recommendation_read_own` | Xem recommendation của chính mình |
| `ai:manage_model` | Quản lý model version/config AI tương lai |

## Matrix by feature

| Feature / Endpoint group | Guest | Student | Instructor | Admin |
| --- | --- | --- | --- | --- |
| `GET /api/v1/courses` | Allow public | Allow | Allow | Allow |
| `GET /api/v1/courses/{courseId}` | Public only | Public/enrolled | Own/public | All |
| `POST /api/v1/courses` | Deny | Deny | Own | Allow |
| `PUT/DELETE /api/v1/courses/{courseId}` | Deny | Deny | Own only | Allow |
| `POST /api/v1/courses/{courseId}/enrollments` | Deny | Allow | Deny by default | Allow for support use case |
| `GET /api/v1/lessons/{lessonId}` | Deny unless preview | Enrolled | Own course | Allow |
| `POST /api/v1/lessons/{lessonId}/complete` | Deny | Own enrollment | Deny | Allow only support/admin override |
| Quiz attempt | Deny | Enrolled | Deny | Allow only test/admin override |
| Assignment submit | Deny | Enrolled | Deny | Allow only support/admin override |
| Assignment grade | Deny | Deny | Own course | Allow |
| Discussion/comment | Deny | Enrolled | Own/enrolled course | Allow |
| Messaging | Deny | Participant only | Participant only | Participant only unless audit policy |
| Notification | Deny | Own only | Own only | Own/admin tools |
| User management | Deny | Own profile only | Own profile only | Allow |
| Analytics | Deny | Own progress | Own course | All |
| AI recommendations | Deny | Own only | Not by default | Admin/config only |

## Resource checks

Role check không đủ cho các endpoint có dữ liệu sở hữu. Service phải kiểm tra:

- `course.instructor_id == currentInstructor.id`
- `enrollment.student_id == currentUser.id`
- `notification.user_id == currentUser.id`
- `conversation_participants.user_id == currentUser.id`
- `assignment.course.instructor_id == currentInstructor.id`

## Deny by default

Endpoint mới phải mặc định deny nếu chưa có permission rõ ràng. Khi thêm module mới, cập nhật tài liệu này và test authorization tương ứng.

