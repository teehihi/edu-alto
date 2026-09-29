-- Development-only sample data. Do not run this script in production.
-- Demo instructor: demo.instructor@edualto.local / DemoInstructor!2026
-- Fixed IDs and upserts make this seed safe to run repeatedly.

begin;

insert into roles (id, name, description, created_at, updated_at)
values ('d47bcfaf-69ca-494f-bc17-4c4b7620f101', 'INSTRUCTOR', 'Instructor account', current_timestamp, current_timestamp)
on conflict (name) do nothing;

insert into users (id, full_name, email, password_hash, status, email_verified_at, created_at, updated_at)
values (
    'd47bcfaf-69ca-494f-bc17-4c4b7620f102', 'Nguyễn Minh Anh', 'demo.instructor@edualto.local',
    '$2y$10$GgV9NUtWXcmtA/ajNs6zBOxJaaxZx4Ot5NSV34gSSzJWxI0lgbjFu', 'ACTIVE',
    current_timestamp, current_timestamp, current_timestamp
)
on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    password_hash = excluded.password_hash,
    status = excluded.status,
    email_verified_at = coalesce(users.email_verified_at, excluded.email_verified_at),
    updated_at = current_timestamp;

insert into user_roles (user_id, role_id)
select 'd47bcfaf-69ca-494f-bc17-4c4b7620f102', id from roles where name = 'INSTRUCTOR'
on conflict (user_id, role_id) do nothing;

insert into profiles (user_id, headline, bio, language, created_at, updated_at)
values (
    'd47bcfaf-69ca-494f-bc17-4c4b7620f102',
    'Giảng viên lập trình Python',
    'Chia sẻ kiến thức lập trình thực tế theo lộ trình dễ tiếp cận cho người mới bắt đầu.',
    'vi', current_timestamp, current_timestamp
)
on conflict (user_id) do update set
    headline = excluded.headline,
    bio = excluded.bio,
    updated_at = current_timestamp;

insert into instructor_profiles (
    user_id, expertise, experience_years, teaching_experience, qualification_summary,
    specialties, created_at, updated_at
)
values (
    'd47bcfaf-69ca-494f-bc17-4c4b7620f102',
    'Lập trình Python và phát triển phần mềm', 6,
    'Hướng dẫn người mới học lập trình qua bài tập và dự án nhỏ.',
    'Kỹ sư phần mềm, tập trung vào Python và tự động hóa.',
    'Python, tư duy lập trình, tự động hóa', current_timestamp, current_timestamp
)
on conflict (user_id) do update set
    expertise = excluded.expertise,
    experience_years = excluded.experience_years,
    teaching_experience = excluded.teaching_experience,
    qualification_summary = excluded.qualification_summary,
    specialties = excluded.specialties,
    updated_at = current_timestamp;

insert into courses (
    id, instructor_id, title, slug, tagline, description, price, original_price,
    level, language, status, created_at, updated_at, published_at
)
values (
    'd47bcfaf-69ca-494f-bc17-4c4b7620f103',
    'd47bcfaf-69ca-494f-bc17-4c4b7620f102',
    'Lập trình Python cơ bản cho người mới bắt đầu',
    'lap-trinh-python-co-ban-cho-nguoi-moi',
    'Học tư duy lập trình và tự viết chương trình Python đầu tiên',
    $course$
Khóa học giúp bạn bắt đầu lập trình từ con số không. Bạn sẽ làm quen với cú pháp Python, biến và kiểu dữ liệu, câu lệnh điều kiện, vòng lặp và cách chia bài toán thành từng bước nhỏ.

Mỗi phần có ví dụ ngắn và bài thực hành. Cuối khóa, bạn sẽ tự xây dựng một chương trình quản lý chi tiêu đơn giản chạy trên máy tính.

Không cần kinh nghiệm lập trình trước đó. Bạn chỉ cần máy tính có thể cài Python và tinh thần sẵn sàng thực hành.
    $course$,
    299000.00, 499000.00, 'BEGINNER', 'vi', 'PUBLISHED',
    current_timestamp, current_timestamp, current_timestamp
)
on conflict (id) do update set
    title = excluded.title,
    slug = excluded.slug,
    tagline = excluded.tagline,
    description = excluded.description,
    price = excluded.price,
    original_price = excluded.original_price,
    level = excluded.level,
    language = excluded.language,
    status = excluded.status,
    updated_at = current_timestamp,
    published_at = coalesce(courses.published_at, excluded.published_at);

insert into sections (id, course_id, title, description, position, created_at, updated_at)
values
    ('d47bcfaf-69ca-494f-bc17-4c4b7620f104', 'd47bcfaf-69ca-494f-bc17-4c4b7620f103',
     'Bắt đầu với Python', 'Chuẩn bị công cụ và làm quen với dữ liệu.', 1, current_timestamp, current_timestamp),
    ('d47bcfaf-69ca-494f-bc17-4c4b7620f105', 'd47bcfaf-69ca-494f-bc17-4c4b7620f103',
     'Điều khiển và thực hành', 'Dùng điều kiện, vòng lặp để giải quyết bài toán nhỏ.', 2, current_timestamp, current_timestamp)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    position = excluded.position,
    updated_at = current_timestamp;

insert into lessons (
    id, section_id, title, slug, description, content, lesson_type, position,
    duration_seconds, is_preview, status, created_at, updated_at
)
values
    (
        'd47bcfaf-69ca-494f-bc17-4c4b7620f106', 'd47bcfaf-69ca-494f-bc17-4c4b7620f104',
        'Chào mừng và cài đặt Python', 'chao-mung-va-cai-dat-python',
        'Chuẩn bị môi trường để chạy chương trình Python đầu tiên.',
        $lesson$
Python được dùng trong phát triển web, phân tích dữ liệu và tự động hóa.

1. Cài Python 3 từ python.org.
2. Mở Terminal hoặc PowerShell.
3. Kiểm tra bằng lệnh `python --version` hoặc `python3 --version`.
4. Tạo tệp `hello.py` với nội dung `print("Xin chào, Python!")` rồi chạy `python hello.py`.

Nếu màn hình in ra lời chào, bạn đã sẵn sàng học tiếp.
        $lesson$,
        'TEXT', 1, 360, true, 'PUBLISHED', current_timestamp, current_timestamp
    ),
    (
        'd47bcfaf-69ca-494f-bc17-4c4b7620f107', 'd47bcfaf-69ca-494f-bc17-4c4b7620f104',
        'Biến và kiểu dữ liệu', 'bien-va-kieu-du-lieu',
        'Lưu trữ và sử dụng dữ liệu cơ bản trong Python.',
        $lesson$
Biến là tên đại diện cho một giá trị:

```python
ten = "An"
tuoi = 20
diem = 8.5
da_dang_ky = True
```

Các kiểu thường dùng gồm chuỗi (`str`), số nguyên (`int`), số thực (`float`) và đúng/sai (`bool`). Dùng `type(ten_bien)` để xem kiểu dữ liệu.

Thực hành: tạo các biến lưu tên món ăn yêu thích, giá tiền và số lượng.
        $lesson$,
        'TEXT', 2, 540, false, 'PUBLISHED', current_timestamp, current_timestamp
    ),
    (
        'd47bcfaf-69ca-494f-bc17-4c4b7620f108', 'd47bcfaf-69ca-494f-bc17-4c4b7620f105',
        'Dự án: quản lý chi tiêu cá nhân', 'du-an-quan-ly-chi-tieu-ca-nhan',
        'Kết hợp biến, danh sách, điều kiện và vòng lặp.',
        $lesson$
Tạo chương trình ghi nhận các khoản chi:
1. Tạo danh sách rỗng `khoan_chi = []`.
2. Hỏi tên khoản chi và số tiền trong một vòng lặp.
3. Thêm khoản chi vào danh sách; nhập `xong` để kết thúc.
4. Dùng `sum()` để tính tổng và in từng khoản chi.

Mở rộng: từ chối số tiền âm và hiển thị khoản chi lớn nhất.
        $lesson$,
        'TEXT', 1, 900, false, 'PUBLISHED', current_timestamp, current_timestamp
    )
on conflict (id) do update set
    title = excluded.title,
    slug = excluded.slug,
    description = excluded.description,
    content = excluded.content,
    lesson_type = excluded.lesson_type,
    position = excluded.position,
    duration_seconds = excluded.duration_seconds,
    is_preview = excluded.is_preview,
    status = excluded.status,
    updated_at = current_timestamp;

commit;
