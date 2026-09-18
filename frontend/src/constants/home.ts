import type { Course } from "@/types/course";

export const courseCategories = [
  { id: "all", label: "Tất cả" },
  { id: "design", label: "Thiết kế UI/UX" },
  { id: "coding", label: "Lập trình Web" },
  { id: "vibe", label: "AI & Vibe Coding" }
] as const;

export const popularCourses: Course[] = [
  {
    id: "ui-design-foundation",
    title: "Figma UI UX Design..",
    category: "Design",
    description: "Sử dụng Figma chuyên nghiệp để sẵn sàng làm việc trong lĩnh vực UI/UX Design, thiết kế giao diện và trải nghiệm người dùng.",
    image: "/images/home/course-figma.png",
    duration: "08 giờ 12 phút",
    rating: 4.3,
    reviewCount: "(16,325)",
    instructor: "Phạm văn Hậu",
    instructorAvatar: "/images/home/author-hau.png",
    joinedAt: "Tham gia từ 2020",
    price: "500.000đ",
    accent: "design"
  },
  {
    id: "programming-basic",
    title: "300 Bài Code Thiếu Nhi",
    category: "Coding Basic",
    description: "Các bài tập lập trình từ cơ bản đến nâng cao, rèn luyện tư duy logic vững chắc cho người mới bắt đầu.",
    image: "/images/home/course-code.png",
    duration: "06 giờ 3 phút",
    rating: 5.0,
    reviewCount: "(832)",
    instructor: "Tee",
    instructorAvatar: "/images/home/author-tee.png",
    joinedAt: "Tham gia từ 2005",
    price: "1.000.000đ",
    accent: "coding"
  },
  {
    id: "vibe-coding",
    title: "Kỹ năng Vibe Coder",
    category: "VibeCoding",
    description: "Làm chủ AI Agent hiện đại, tối ưu hiệu suất lập trình và sẵn sàng dẫn đầu xu hướng công nghệ tương lai.",
    image: "/images/home/course-vibe.png",
    duration: "01 giờ 2 phút",
    rating: 4.2,
    reviewCount: "(125)",
    instructor: "Công Ank",
    instructorAvatar: "/images/home/author-ank.png",
    joinedAt: "Tham gia từ 2020",
    price: "360.000đ",
    accent: "vibe"
  }
];

export const testimonials = [
  {
    id: "review-1",
    quote: "Các khóa học thật tuyệt vời! Đây là nền tảng hoàn hảo cho những ai muốn bắt đầu một sự nghiệp mới hoặc cần ôn lại kiến thức.",
    author: "Lê Quốc Khánh",
    role: "Sinh Viên, Đại học Kinh tế TP.HCM",
    avatar: "/images/home/testimonial-khanh.png"
  },
  {
    id: "review-2",
    quote: "Giao diện trực quan, bài giảng cô đọng và thực tế giúp mình nhanh chóng áp dụng vào các dự án công việc hàng ngày.",
    author: "Nguyễn Nhật Thiên",
    role: "Software Engineer, EduAlto",
    avatar: "/images/home/author-tee.png"
  },
  {
    id: "review-3",
    quote: "Nội dung khóa học Figma và UI/UX được chuẩn bị rất kỹ lưỡng, mentor hỗ trợ nhiệt tình và giải đáp mọi thắc mắc.",
    author: "Phạm Văn Hậu",
    role: "Product Designer, EduAlto",
    avatar: "/images/home/author-hau.png"
  }
];

export const features = [
  {
    title: "Khóa Học Đa Dạng",
    description: "Khám phá nhiều khóa học phù hợp với nhu cầu học tập của bạn.",
    tone: "primary",
    icon: "/icons/home/course 1.svg"
  },
  {
    title: "Bài Học Trực Tuyến",
    description: "Học mọi lúc, mọi nơi với nội dung được xây dựng trực quan và dễ tiếp cận.",
    tone: "blue",
    icon: "/icons/home/Icon.svg"
  },
  {
    title: "Kiểm Tra & Đánh Giá",
    description: "Củng cố kiến thức thông qua các bài kiểm tra và đánh giá sau mỗi nội dung học tập.",
    tone: "rose",
    icon: "/icons/home/quiz 1.svg"
  }
] as const;

export const instructors = [
  {
    name: "PSG. TS. Hoàng Văn Dũng",
    role: "Phó Trưởng khoa CNTT",
    description: "Các thông tin liên quan về PSG TS Hoàng Văn Dũng",
    image: "/images/home/instructor-dung.png"
  },
  {
    name: "TS. Nguyễn Thành Sơn",
    role: "Trùm cuối CSDL",
    description: "Lead engineering teams at Figma, Pitch, and Protocol Labs.",
    image: "/images/home/instructor-son.png"
  },
  {
    name: "ThS. Trần Mạnh Hùng",
    role: "Trùm Thể chất",
    description: "Former PM for Linear, Lambda School, and On Deck.",
    image: "/images/home/instructor-hung.png"
  },
  {
    name: "TS. Đặng Thị Minh Tuấn",
    role: "Bà Trùm Triết Học",
    description: "Former frontend dev for Linear, Coinbase, and Postscript.",
    image: "/images/home/instructor-tuan.png"
  }
] as const;

export const blogPosts = [
  {
    title: "Ba Yếu Tố tạo nên Sự Hài Lòng của Người Dùng",
    date: "24 tháng 11, 2006",
    description: "Niềm vui có thể được cảm nhận một cách trực quan, qua hành vi và qua suy nghĩ. Một thiết kế tuyệt vời là...",
    image: "/images/home/blog-featured.png",
    tags: ["Programming", "Research", "Developments"],
    featured: true
  },
  {
    title: "Three Pillars of User Delight",
    date: "21 tháng 05, 2005",
    description: "Delight can be experienced viscerally, behaviourally, and reflectively. A great design is ...",
    image: "/images/home/blog-delight.png",
    tags: ["Research", "UI UX"],
    featured: false
  },
  {
    title: "UX Mapping Methods",
    date: "30 tháng 4, 2021",
    description: "Visual-design principles can be applied consistently throughout the process of creating a polished UX map...",
    image: "/images/home/blog-workspace.png",
    tags: ["Research", "UI Design"],
    featured: false
  }
] as const;

