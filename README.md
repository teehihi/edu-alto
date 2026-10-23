<div align="center">
  <img src="frontend/public/images/logo-with-text.png" alt="EduAlto Logo" width="280" />

  <p>
    <strong>Nền tảng học tập trực tuyến (LMS) thế hệ mới dành cho người dùng Việt Nam</strong><br />
    Xây dựng theo kiến trúc <em>Modular Monolith</em> hiện đại, bảo mật chuẩn doanh nghiệp, tối ưu hóa hiệu năng vượt trội và sẵn sàng mở rộng AI.
  </p>

  <p>
    <a href="https://github.com/teehihi/edu-alto"><img alt="GitHub repo" src="https://img.shields.io/badge/Repository-edu--alto-20B486?style=for-the-badge&logo=github&logoColor=white" /></a>
    <img alt="Java 25" src="https://img.shields.io/badge/Java-25%20LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" />
    <img alt="Spring Boot 4" src="https://img.shields.io/badge/Spring%20Boot-4.0.7-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" />
    <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16.3-000000?style=for-the-badge&logo=next.js&logoColor=white" />
    <img alt="React 19" src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
    <img alt="PostgreSQL 16" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
    <img alt="Redis 8" src="https://img.shields.io/badge/Redis-8.8-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
    <img alt="AWS Lightsail" src="https://img.shields.io/badge/AWS-Lightsail-FF9900?style=for-the-badge&logo=amazonwebservices&logoColor=white" />
  </p>

  <p>
    <a href="#-h%C3%ACnh-%E1%BA%A3nh-th%E1%BB%B1c-t%E1%BA%BF-h%E1%BB%87-th%E1%BB%91ng">📸 Hình ảnh thực tế</a> •
    <a href="#-t%C3%ADnh-n%C4%83ng-c%E1%BB%91t-l%C3%B5i">✨ Tính năng cốt lõi</a> •
    <a href="#-ki%E1%BA%BFn-tr%C3%BAc-h%E1%BB%87-th%E1%BB%91ng">🏗 Kiến trúc</a> •
    <a href="#-c%C3%B4ng-ngh%E1%BB%87-s%E1%BB%AD-d%E1%BB%A5ng">💻 Tech Stack</a> •
    <a href="#-h%C6%B0%E1%BB%9Bng-d%E1%BA%ABn-c%C3%A0i-%C4%91%E1%BA%B7t-local">🚀 Bắt đầu nhanh</a> •
    <a href="#-b%E1%BA%A3o-m%E1%BA%ADt--ch%E1%BA%A5t-l%C6%B0%E1%BB%A3ng">🛡 Bảo mật</a>
  </p>
</div>

---

## 📖 Giới Thiệu

**EduAlto** là nền tảng quản lý học tập trực tuyến (Learning Management System - LMS) toàn diện phục vụ ba nhóm đối tượng chính: **Học viên**, **Giảng viên** và **Quản trị viên**.

Dự án được xây dựng với mục tiêu đem lại trải nghiệm học tập chuẩn mực và mượt mà cho thị trường Việt Nam:
- **Trải nghiệm học tập chuẩn xác:** Giao diện bám sát thiết kế Figma với hệ thống Design Tokens nhất quán (Primary `#20B486`, Heading `#101A2C`), hiển thị nội dung trực quan, hỗ trợ xem trước video và bài kiểm tra trắc nghiệm tương tác cao.
- **Thanh toán tức thì đa kênh:** Tích hợp chuyển khoản tự động qua **VietQR (SePay)**, ví điện tử **MoMo**, cổng quốc tế **Stripe** và **VNPay** với cơ chế webhook bất đồng bộ, kích hoạt ghi danh ngay sau thanh toán.
- **Biên soạn bài giảng & Trắc nghiệm AI:** Bộ công cụ giảng viên chuyên sâu với trình tạo khóa học kéo thả, hỗ trợ **Google Gemini AI** tự động sinh đề trắc nghiệm thông minh từ đề cương.
- **Kiến trúc bền vững:** Áp dụng mô hình **Modular Monolith** phân tầng rõ ràng, cơ chế HttpOnly Cookie bảo mật cao chống XSS, cache phân tán Redis 8, Flyway migration và pipeline kiểm thử tự động với Testcontainers.

---

## 📸 Hình Ảnh Thực Tế Hệ Thống

### 1. Kiến Trúc Hạ Tầng & Triển Khai AWS
Hệ thống vận hành thực tế trên đám mây **AWS Lightsail** kết hợp **Cloudflare R2** và **Vercel**:

<div align="center">
  <img src="https://res.cloudinary.com/jvroseba/image/upload/v1792127832/EduAlto_Architecture.png" alt="Sơ đồ kiến trúc EduAlto AWS Lightsail" width="95%" />
  <p><em>Sơ đồ kiến trúc hạ tầng EduAlto trên AWS Lightsail, Reverse Proxy Caddy SSL, RDS PostgreSQL, Redis và Cloudflare R2</em></p>
</div>

### 2. Trải Nghiệm Khóa Học & Đề Cương Bài Giảng
Trang chi tiết khóa học hiển thị thông tin trực quan, đề cương phân cấp Section/Lesson và card đăng ký học nổi bật:

<div align="center">
  <img src="https://res.cloudinary.com/jvroseba/image/upload/c_scale,w_1000,q_auto,f_auto/v1791557226/courseDetail.png" alt="Trang chi tiết khóa học EduAlto" width="95%" />
  <p><em>Giao diện chi tiết khóa học với video preview, lộ trình giáo trình và thông tin giảng viên</em></p>
</div>

### 3. Quy Trình Thanh Toán & Đối Soát Tự Động
Hỗ trợ tạo mã VietQR động, thanh toán quét mã tức thời và tự động mở khóa bài giảng trong tích tắc:

| Trang Thanh Toán (Checkout & VietQR) | Xác Nhận Thanh Toán Thành Công |
|:---:|:---:|
| <img src="https://res.cloudinary.com/jvroseba/image/upload/c_scale,w_1000,q_auto,f_auto/v1791557225/checkoutPage.png" alt="Checkout EduAlto" width="100%" /> | <img src="https://res.cloudinary.com/jvroseba/image/upload/c_scale,w_1000,q_auto,f_auto/v1791557225/paymentSuccess.png" alt="Payment Success EduAlto" width="100%" /> |
| <em>Chọn phương thức thanh toán VietQR / MoMo / Stripe</em> | <em>Webhook xử lý giao dịch thời gian thực & ghi danh khóa học</em> |

---

## ✨ Tính Năng Cốt Lõi

### 🧑‍🎓 1. Dành cho Học viên (Learner Experience)
- **Khám phá khóa học thông minh:** Bộ lọc đa tiêu chí (danh mục, cấp độ, giá, đánh giá), tìm kiếm full-text, phân trang chuẩn RESTful.
- **Học thử miễn phí:** Xem video học thử hoặc tài liệu mẫu trước khi quyết định ghi danh.
- **Giỏ hàng & Thanh toán đa kênh:** Hỗ trợ thanh toán VietQR tự động qua SePay, MoMo, Stripe; xử lý đơn hết hạn và xác nhận tức thì qua Webhook.
- **Không gian học tập chuyên sâu:** Trình phát video streaming có phân quyền chặt chẽ, theo dõi tiến độ hoàn thành theo từng bài học (Progress tracking).
- **Làm bài thi trắc nghiệm (Quiz):** Giao diện làm bài kiểm tra đếm ngược thời gian thực, tự động chấm điểm và hiển thị giải thích chi tiết.
- **Tương tác & Đánh giá:** Đánh giá khóa học (Rating & Review) và hệ thống thông báo sự kiện học tập theo thời gian thực.

### 👨‍🏫 2. Dành cho Giảng viên (Instructor Workspace)
- **Bảng điều khiển giảng viên:** Thống kê trực quan số lượng học viên ghi danh, tổng khóa học và doanh thu thực tế.
- **Bộ công cụ biên soạn khóa học (Course Builder):** Tạo và cập nhật khóa học, tải ảnh bìa (tự động nén WebP tại backend), cấu hình giá khuyến mãi.
- **Biên tập giáo trình (Curriculum Management):** Quản lý cấu trúc phân cấp linh hoạt theo Chương (`Section`) và Bài học (`Lesson`).
- **Tạo bài thi trắc nghiệm thông minh với Gemini AI:**
  - Soạn câu hỏi thủ công với nhiều đáp án lựa chọn và giải thích đáp án.
  - Sử dụng trợ lý **Google Gemini AI** tự động tạo bộ câu hỏi trắc nghiệm chất lượng cao dựa trên chủ đề và mục tiêu của bài học.
- **Quản lý học viên:** Theo dõi danh sách học viên ghi danh, tiến độ học tập và kết quả kiểm tra.

### 🛡 3. Dành cho Quản trị viên (Admin Workspace)
- **Trung tâm điều hành dữ liệu thực:** Báo cáo doanh thu và vận hành theo các mốc thời gian động: *Hôm nay*, *7 ngày*, *30 ngày*, *Năm nay*.
- **Phân quyền & Cấp quyền người dùng toàn diện (RBAC CRUD):**
  - Quản lý danh sách thành viên toàn hệ thống với bộ lọc vai trò (`STUDENT`, `INSTRUCTOR`, `ADMIN`) và tìm kiếm từ khóa.
  - Modal phân quyền trực quan: Cấp hoặc thu hồi vai trò cho từng thành viên; có cơ chế bảo vệ an toàn chống tự thu hồi quyền Admin.
  - Kiểm soát trạng thái tài khoản: Kích hoạt (`ACTIVE`), Tạm khóa (`LOCKED`), Vô hiệu hóa (`DISABLED`) hoặc Chờ xác thực.
  - Đặt lại mật khẩu nhanh cho người dùng khi có yêu cầu hỗ trợ.
- **Đối soát thanh toán & Duyệt khóa học:** Kiểm soát các giao dịch tài chính, kiểm duyệt nội dung khóa học trước khi công khai ra thị trường.

---

## 🏗 Kiến Trúc Hệ Thống

EduAlto áp dụng kiến trúc **Modular Monolith** phân tầng đơn hướng, đảm bảo tính cô lập, dễ bảo trì và loại bỏ hoàn toàn sự phức tạp không cần thiết của microservices:

```text
Controller (REST API / Swagger)
   ↓
Service / Application (Use Cases & Business Logic)
   ↓
Domain (Entities, Value Objects & Core Rules)
   ↓
Repository (Spring Data JPA / Native SQL Projections)
   ↓
Infrastructure (PostgreSQL 16, Redis 8, Cloudflare R2, Gemini AI)
```

### Ranh Giới 20 Module Độc Lập
Hệ thống được chia thành các vertical slice độc lập về nghiệp vụ:
- `auth`: Đăng ký, đăng nhập, mã OTP SHA-256, Refresh Token Cookie.
- `user` & `profile`: Quản lý danh tính, phân quyền và hồ sơ chuyên môn học viên / giảng viên.
- `course` & `lesson`: Danh mục khóa học, giáo trình, bài học đa phương tiện và video streaming.
- `enrollment` & `learning`: Ghi danh khóa học, theo dõi tiến độ bài giảng.
- `quiz` & `assignment`: Kiểm tra đánh giá, chấm điểm và AI Question Generator.
- `commerce` & `payment`: Đơn hàng, giỏ hàng, webhook thanh toán VietQR / MoMo / Stripe.
- `admin`: Trung tâm vận hành, phân quyền người dùng và báo cáo thống kê.
- `ai`: Tích hợp Google Gemini API phục vụ các tác vụ thông minh.
- `notification`, `discussion`, `review`, `certificate`, `analytics`...

---

## 💻 Công Nghệ Sử Dụng

| Tầng kiến trúc | Công nghệ chính | Phiên bản | Mô tả vai trò |
|:---|:---|:---|:---|
| **Frontend Framework** | [Next.js](https://nextjs.org/) | `16.3.1` | App Router, Turbopack, SSR/CSR tối ưu hóa SEO |
| **Frontend Core** | [React](https://react.dev/) | `19.2.8` | UI Library thế hệ mới nhất |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `5.9.3` | An toàn kiểu dữ liệu end-to-end |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | `3.4.16` | Thiết kế giao diện hiện đại theo Figma Design Tokens |
| **Frontend Tooling** | [Oxlint](https://oxc.rs/) & [Oxfmt](https://oxc.rs/) | `1.78` / `0.63` | Bộ kiểm tra lint & định dạng code siêu tốc (~20ms) |
| **Frontend Testing** | [Vitest](https://vitest.dev/) & Testing Library | `4.1.10` | Unit & Component testing với cấu hình jsdom |
| **Backend Framework** | [Spring Boot](https://spring.io/projects/spring-boot) | `4.0.7` | Nền tảng backend chuẩn mực cho doanh nghiệp |
| **Java Runtime** | [Eclipse Temurin OpenJDK](https://adoptium.net/) | `Java 25 LTS` | Runtime Java phiên bản hỗ trợ dài hạn mới nhất |
| **Security** | Spring Security & JJWT | `7.0.x` | Stateless JWT + HttpOnly Cookie, bảo vệ CSRF/XSS |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | `16-alpine` | Cơ sở dữ liệu quan hệ chính với UUID primary keys |
| **Database Migration** | [Flyway](https://flywaydb.org/) | `11.14.1` | Quản lý phiên bản migration cơ sở dữ liệu (V1–V30) |
| **Distributed Cache** | [Redis](https://redis.io/) | `8.8.0` | Cache danh mục khóa học, session và rate-limiting |
| **Integration Testing**| [Testcontainers](https://testcontainers.com/) | `2.0.5` | Chạy database PostgreSQL 16 cô lập trong Docker khi test |
| **Cloud Storage** | [Cloudflare R2](https://www.cloudflare.com/products/r2/) | S3 API | Lưu trữ ảnh và tài liệu bài học, presigned stream video |
| **AI Integration** | [Google Gemini AI](https://ai.google.dev/) | `gemini-1.5` | Trợ lý thông minh hỗ trợ biên soạn câu hỏi Quiz |
| **Cloud Hosting** | [AWS Lightsail](https://aws.amazon.com/lightsail/) & [Vercel](https://vercel.com/) | Ubuntu VPS | Triển khai container hóa với Caddy Reverse Proxy SSL |

---

## 🚀 Hướng Dẫn Cài Đặt Local

### Yêu Cầu Môi Trường
- **Java:** JDK 25 LTS (Khuyến nghị Eclipse Temurin 25).
- **Node.js:** Node.js 22.x LTS trở lên.
- **Package Manager:** Bắt buộc sử dụng `pnpm` (phiên bản 10.x).
- **Docker & Docker Compose:** Dùng để chạy PostgreSQL 16 và Redis 8.8 cục bộ.
- **WebP Tools (Tùy chọn):** Trên macOS, cài đặt qua `brew install webp` nếu muốn chạy backend trực tiếp ngoài Docker.

---

### Bước 1: Clone Repository & Cài Đặt Dependencies

```bash
git clone https://github.com/teehihi/edu-alto.git
cd edu-alto

# Đồng bộ toàn bộ dependencies của Monorepo bằng pnpm
pnpm install
```

---

### Bước 2: Cấu Hình Biến Môi Trường

Sao chép file cấu hình mẫu:
```bash
cp .env.example .env
```

Mở file `.env` và thiết lập các biến bảo mật quan trọng:
```env
# Database Credentials
POSTGRES_DB=edualto
POSTGRES_USER=edualto
POSTGRES_PASSWORD=your_secure_password_here

# JWT Secret (Tối thiểu 32 ký tự, tạo nhanh: openssl rand -base64 48)
JWT_SECRET=your_base64_jwt_secret_key_here_minimum_32_bytes_length

# Payment Provider Keys (Tùy chọn cho local)
SEPAY_API_KEY=
MOMO_ACCESS_KEY=
STRIPE_SECRET_KEY=
```

---

### Bước 3: Khởi Động Infrastructure (PostgreSQL & Redis)

Sử dụng Docker Compose để bật cơ sở dữ liệu và cache:
```bash
docker compose up -d postgres redis
```

Kiểm tra trạng thái containers:
```bash
docker compose ps
```

---

### Bước 4: Khởi Động Backend (Spring Boot 4 / Java 25)

Dự án tích hợp sẵn Maven Wrapper (`./backend/mvnw`), không yêu cầu cài đặt Maven toàn cục:

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/edualto
export SPRING_DATASOURCE_USERNAME=edualto
export SPRING_DATASOURCE_PASSWORD=your_secure_password_here
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=your_base64_jwt_secret_key_here_minimum_32_bytes_length

# Chạy Backend
./backend/mvnw -f backend/pom.xml spring-boot:run
# hoặc sử dụng script root:
pnpm backend:dev
```

Sau khi khởi động thành công:
- **API Server:** `http://localhost:8080/api/v1`
- **Tài liệu OpenAPI (Swagger UI):** `http://localhost:8080/swagger-ui.html`

---

### Bước 5: Khởi Động Frontend (Next.js 16 / React 19)

Mở terminal mới và khởi động giao diện người dùng:
```bash
pnpm frontend:dev
```

Mở trình duyệt tại:
```text
http://localhost:3002
```

---

## 🧪 Kiểm Thử & Tiêu Chuẩn Chất Lượng (Quality Gates)

Dự án áp dụng bộ quy chuẩn kiểm thử nghiêm ngặt trước khi tích hợp vào nhánh chính:

### 1. Kiểm tra Frontend
```bash
# 1. Kiểm tra lint siêu tốc với Oxlint (Bắt buộc 0 error, 0 warning)
pnpm frontend:lint:fast

# 2. Kiểm tra lint chi tiết với ESLint 9
pnpm frontend:lint

# 3. Kiểm tra định dạng code với Oxfmt
pnpm frontend:fmt:check
pnpm frontend:fmt        # Tự động sửa format

# 4. Kiểm tra an toàn kiểu dữ liệu TypeScript
pnpm frontend:typecheck

# 5. Chạy toàn bộ Unit & Component tests với Vitest
pnpm --dir frontend test
```

### 2. Kiểm tra Backend
```bash
# Chạy bộ Integration Tests độc lập với Testcontainers PostgreSQL 16
./backend/mvnw -f backend/pom.xml test
# hoặc qua pnpm:
pnpm backend:test

# Đóng gói ứng dụng production JAR
./backend/mvnw -f backend/pom.xml package -DskipTests
```

---

## 🛡 Bảo Mật & Best Practices

- **Bảo mật xác thực:**
  - Mật khẩu người dùng được băm bằng thuật toán an toàn `BCrypt`.
  - Refresh Token được lưu trữ trong **HttpOnly Cookie** (`edualto.refresh`), SameSite linh hoạt (`Lax` trên localhost, `None; Secure` khi production cross-origin).
  - Cơ chế xoay vòng Refresh Token (Token Rotation) và lưu trữ dạng băm trong cơ sở dữ liệu để ngăn chặn tấn công đánh cắp token.
  - Mã xác thực OTP qua email được băm **SHA-256**, có TTL ngắn (5 phút), giới hạn số lần nhập sai và áp dụng rate-limit chống brute-force.
- **Quản lý phân quyền Role-Based Access Control (RBAC):**
  - Phân tách quyền chặt chẽ giữa `STUDENT`, `INSTRUCTOR` và `ADMIN`.
  - Endpoint nhạy cảm yêu cầu kiểm tra trạng thái hoạt động thực tế `requireActiveAdmin`, `requireActiveInstructor`.
- **An toàn lưu trữ đa phương tiện:**
  - Tải ảnh đại diện/thumbnail bắt buộc qua backend để chuẩn hóa kích thước và chuyển đổi sang định dạng nén tối ưu WebP trước khi đưa lên Cloudflare R2.
  - Video bài giảng chỉ cấp quyền phát thông qua **Presigned Streaming URL** có kiểm tra trạng thái ghi danh khóa học hợp lệ.
- **Xử lý lỗi tập trung:**
  - Toàn bộ exception được xử lý qua `@RestControllerAdvice`, che giấu hoàn toàn stack trace kỹ thuật và trả về cấu trúc lỗi chuẩn hóa `ApiResponse` bằng tiếng Việt thân thiện với người dùng.

---

## 📁 Cấu Trúc Dự Án (Monorepo)

```text
.
├── .github/                 # GitHub Actions workflows & CI/CD configs
├── backend/                 # Mã nguồn Backend Spring Boot 4 / Java 25 LTS
│   ├── src/main/java/com/edualto/
│   │   ├── admin/           # Bảng quản trị, phân quyền RBAC & thống kê
│   │   ├── ai/              # Tích hợp Google Gemini AI sinh câu hỏi Quiz
│   │   ├── auth/            # Xác thực, JWT, OTP, Refresh Token
│   │   ├── course/          # Khóa học, giáo trình, bài học, danh mục
│   │   ├── commerce/        # Đơn hàng, thanh toán VietQR/MoMo/Stripe
│   │   ├── enrollment/      # Ghi danh học tập & phân quyền truy cập
│   │   ├── learning/        # Tiến độ học tập bài giảng & tài liệu
│   │   ├── quiz/            # Bài thi trắc nghiệm, chấm điểm tự động
│   │   ├── user/            # Quản lý người dùng, vai trò & hồ sơ cá nhân
│   │   └── common/          # Cấu hình bảo mật, Redis, Swagger, exception
│   ├── src/main/resources/
│   │   └── db/migration/    # 30 file migration Flyway cho PostgreSQL
│   ├── Dockerfile           # Multi-stage Docker build cho backend
│   └── pom.xml              # Maven dependencies & plugins
├── frontend/                # Mã nguồn Frontend Next.js 16 / React 19
│   ├── src/
│   │   ├── app/             # Next.js App Router pages & layouts
│   │   ├── components/      # UI components tái sử dụng (Button, Modal, Avatar...)
│   │   ├── features/        # Các feature slice chính (auth, course, admin...)
│   │   ├── lib/             # API clients, auth session, helpers
│   │   └── types/           # Định nghĩa kiểu dữ liệu TypeScript dùng chung
│   ├── public/              # Static assets, logos, icons và ảnh minh họa
│   └── package.json         # Scripts & dependencies frontend
├── docs/                    # Tài liệu kiến trúc chuyên sâu
│   ├── architecture/        # Sơ đồ kiến trúc, ADRs, luồng dữ liệu
│   ├── database/            # Thiết kế ERD và danh mục bảng
│   ├── deployment/          # Hướng dẫn triển khai AWS Lightsail & Docker
│   ├── security/            # Ma trận phân quyền & tài liệu bảo mật
│   └── api/                 # Quy chuẩn thiết kế RESTful API
├── docker-compose.yml       # Docker Compose chạy PostgreSQL 16 & Redis 8.8
├── AGENTS.md                # Quy tắc & tiêu chuẩn phát triển cho AI Agents
└── README.md                # Tài liệu tổng quan dự án
```

---

## 📚 Tài Liệu Tham Khảo Thêm

- [Kiến trúc hệ thống chi tiết (Architecture Standards)](docs/architecture/architecture.md)
- [Ranh giới các module nghiệp vụ (Module Boundaries)](docs/architecture/module-boundaries.md)
- [Thiết kế cơ sở dữ liệu quan hệ & ERD (Database Design)](docs/database/database-design.md)
- [Tài liệu thiết kế RESTful API (API Design)](docs/api/api-design.md)
- [Mô hình bảo mật & phân quyền (Security & Authorization)](docs/security/authentication-authorization.md)
- [Hướng dẫn triển khai AWS Lightsail (Deployment Guide)](docs/deployment/lightsail.md)

---

<div align="center">
  <sub>Được phát triển với niềm đam mê dành cho giáo dục trực tuyến Việt Nam 🇻🇳</sub><br />
  <strong>EduAlto</strong> • <em>Empowering Modern Learning</em>
</div>
