import type { Course } from "@/types/course";

export const courseCategories = [
  { id: "all", label: "Tất cả" },
  { id: "design", label: "Thiết kế UI/UX" },
  { id: "coding", label: "Lập trình Web" },
  { id: "vibe", label: "AI & Vibe Coding" },
] as const;

export const popularCourses: Course[] = [
  {
    id: "ui-design-foundation",
    title: "Figma UI UX Design Cơ Bản Đến Nâng Cao",
    category: "Design",
    description:
      "Sử dụng Figma chuyên nghiệp để sẵn sàng làm việc trong lĩnh vực UI/UX Design, thiết kế giao diện và trải nghiệm người dùng.",
    image: "/images/home/course-figma.png",
    duration: "08 giờ 12 phút",
    rating: 4.8,
    reviewCount: "(16,325)",
    instructor: "Phạm Văn Hậu",
    instructorAvatar: "/images/home/author-hau.png",
    joinedAt: "Tham gia từ 2022",
    price: "500.000đ",
    accent: "design",
  },
  {
    id: "programming-basic",
    title: "300 Bài Code Thiếu Nhi",
    category: "Coding Basic",
    description:
      "Các bài tập lập trình từ cơ bản đến nâng cao, rèn luyện tư duy logic vững chắc cho người mới bắt đầu.",
    image: "/images/home/course-code.png",
    duration: "06 giờ 3 phút",
    rating: 5.0,
    reviewCount: "(832)",
    instructor: "Tee",
    instructorAvatar: "/images/home/author-tee.png",
    joinedAt: "Tham gia từ 2021",
    price: "1.000.000đ",
    accent: "coding",
  },
  {
    id: "vibe-coding",
    title: "Kỹ Năng Vibe Coder Với AI",
    category: "VibeCoding",
    description:
      "Làm chủ AI Agent hiện đại, tối ưu hiệu suất lập trình và sẵn sàng dẫn đầu xu hướng công nghệ tương lai.",
    image: "/images/home/course-vibe.png",
    duration: "01 giờ 2 phút",
    rating: 4.7,
    reviewCount: "(125)",
    instructor: "Công Ank",
    instructorAvatar: "/images/home/author-ank.png",
    joinedAt: "Tham gia từ 2023",
    price: "360.000đ",
    accent: "vibe",
  },
];

export const testimonials = [
  {
    id: "review-1",
    quote:
      "Nội dung khóa học Figma rất thực tế. Sau 2 tháng học mình đã tự tin ứng tuyển vị trí UI Designer tại công ty công nghệ.",
    author: "Lê Quốc Khánh",
    role: "Sinh Viên ĐH Kinh Tế TP.HCM",
    course: "Khóa Figma UI/UX",
    rating: 5,
    avatar: "/images/home/testimonial-khanh.png",
  },
  {
    id: "review-2",
    quote:
      "Bài giảng cô đọng, đi thẳng vào ứng dụng thực tế giúp mình áp dụng được ngay vào các dự án phần mềm hàng ngày.",
    author: "Nguyễn Nhật Thiên",
    role: "Software Engineer, EduAlto",
    course: "Khóa Web Fullstack",
    rating: 5,
    avatar: "/images/home/author-tee.png",
  },
  {
    id: "review-3",
    quote:
      "Mentor sửa bài rất chi tiết, giải đáp từng thắc mắc thiết kế. Nền tảng học tập mượt mà nhất mình từng trải nghiệm.",
    author: "Phạm Văn Hậu",
    role: "Product Designer, EduAlto",
    course: "Khóa Thiết Kế Giao Diện",
    rating: 5,
    avatar: "/images/home/author-hau.png",
  },
  {
    id: "review-4",
    quote:
      "Khóa Vibe Coding giúp mình tiếp cận AI Agent cực kỳ nhanh, tăng gấp đôi tốc độ phát triển sản phẩm cá nhân.",
    author: "Nguyễn Công Anh",
    role: "Tech Lead • AI Enthusiast",
    course: "Khóa AI & Vibe Coding",
    rating: 5,
    avatar: "/images/home/author-ank.png",
  },
  {
    id: "review-5",
    quote:
      "Các bài kiểm tra trắc nghiệm và thử thách code thực hành sau mỗi bài học giúp người mới bắt đầu không bị ngợp kiến thức.",
    author: "Hoàng Mai Anh",
    role: "Frontend Developer",
    course: "Khóa 300 Bài Code Thiếu Nhi",
    rating: 5,
    avatar: "",
  },
  {
    id: "review-6",
    quote:
      "Giao diện học tập tối ưu, theo dõi tiến độ rõ ràng và hệ thống cấp chứng chỉ chuẩn chỉnh sau khi hoàn tất khóa học.",
    author: "Trần Đăng Khoa",
    role: "Học viên EduAlto",
    course: "Khóa Thiết Kế Đồ Họa",
    rating: 5,
    avatar: "",
  },
];

export const features = [
  {
    title: "Khóa Học Đa Dạng",
    description: "Khám phá nhiều khóa học phù hợp với nhu cầu học tập của bạn.",
    tone: "primary",
    icon: "/icons/home/course 1.svg",
  },
  {
    title: "Bài Học Trực Tuyến",
    description: "Học mọi lúc, mọi nơi với nội dung được xây dựng trực quan và dễ tiếp cận.",
    tone: "blue",
    icon: "/icons/home/Icon.svg",
  },
  {
    title: "Kiểm Tra & Đánh Giá",
    description:
      "Củng cố kiến thức thông qua các bài kiểm tra và đánh giá sau mỗi nội dung học tập.",
    tone: "rose",
    icon: "/icons/home/quiz 1.svg",
  },
] as const;

export const instructors = [
  {
    name: "PGS. TS. Hoàng Văn Dũng",
    role: "Phó Trưởng khoa CNTT",
    description: "Chuyên gia đầu ngành về Trí tuệ nhân tạo và Khoa học máy tính.",
    image: "/images/home/instructor-dung.png",
  },
  {
    name: "TS. Nguyễn Thành Sơn",
    role: "Chuyên Gia Cơ Sở Dữ Liệu",
    description: "Kinh nghiệm nghiên cứu và phát triển hệ thống dữ liệu quy mô lớn.",
    image: "/images/home/instructor-son.png",
  },
  {
    name: "ThS. Trần Mạnh Hùng",
    role: "Giảng Viên Kỹ Năng & Thể Chất",
    description: "Huấn luyện viên thể chất và kỹ năng quản trị năng lượng học tập.",
    image: "/images/home/instructor-hung.png",
  },
  {
    name: "TS. Đặng Thị Minh Tuấn",
    role: "Tiến Sĩ Triết Học & Tư Duy",
    description: "Nghiên cứu phương pháp luận tư duy phản biện và đạo đức công nghệ.",
    image: "/images/home/instructor-tuan.png",
  },
] as const;

export const blogPosts = [
  {
    title: "Ba Yếu Tố Tạo Nên Sự Hài Lòng Của Người Dùng Trong Thiết Kế",
    date: "15 tháng 08, 2025",
    description:
      "Niềm vui và sự gắn bó của người dùng được xây dựng từ trực giác, hành vi tương tác và cảm xúc phản chiếu. Một thiết kế xuất sắc cần kết hợp cả ba yếu tố này.",
    image: "/images/home/blog-featured.png",
    tags: ["Thiết Kế", "Nghiên Cứu", "Trải Nghiệm"],
    featured: true,
  },
  {
    title: "Ba Trụ Cột Tạo Nên Trải Nghiệm Người Dùng Thú Vị",
    date: "02 tháng 09, 2025",
    description:
      "Khám phá các nguyên lý tâm lý học ứng dụng vào giao diện sản phẩm số, giúp giữ chân người dùng và nâng cao giá trị thương hiệu.",
    image: "/images/home/blog-delight.png",
    tags: ["Nghiên Cứu", "UI/UX"],
    featured: false,
  },
  {
    title: "Phương Pháp Xây Dựng Bản Đồ Trải Nghiệm (UX Mapping)",
    date: "20 tháng 09, 2025",
    description:
      "Hướng dẫn từng bước thiết lập sơ đồ hành trình người dùng (User Journey Map) chuẩn quốc tế nhằm phát hiện điểm nghẽn và cải tiến luồng nghiệp vụ.",
    image: "/images/home/blog-workspace.png",
    tags: ["Quy Trình", "Thiết Kế UI"],
    featured: false,
  },
] as const;
