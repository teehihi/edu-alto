import type { Course } from "@/types/course";

export const popularCourses: Course[] = [
  {
    id: "figma-ui-ux",
    title: "Figma UI UX Design..",
    category: "Design",
    description: "Học cách xây dựng giao diện trực quan, dễ dùng và sẵn sàng chuyển giao cho đội phát triển.",
    duration: "08 giờ 12 phút",
    rating: 4.3,
    reviewCount: "16,325",
    instructor: "Phạm Văn Hậu",
    joinedAt: "Tham gia từ 2020",
    price: "500.000đ",
    accent: "design"
  },
  {
    id: "coding-basic",
    title: "300 Bài Code Thiếu Nhi",
    category: "Coding Basic",
    description: "Các bài code nhập môn từ cơ bản đến nâng cao, phù hợp cho việc bắt đầu lập trình.",
    duration: "06 giờ 3 phút",
    rating: 5.0,
    reviewCount: "832",
    instructor: "Tee",
    joinedAt: "Tham gia từ 2005",
    price: "1.000.000đ",
    accent: "coding"
  },
  {
    id: "vibe-coder",
    title: "Kỹ năng Vibe Coder",
    category: "VibeCoding",
    description: "Học cách làm chủ các công cụ AI Agent mới nhất, sẵn sàng bắt kịp xu hướng.",
    duration: "01 giờ 2 phút",
    rating: 4.2,
    reviewCount: "125",
    instructor: "Công Ank",
    joinedAt: "Tham gia từ 2020",
    price: "360.000đ",
    accent: "ai"
  }
];

export const features = [
  {
    title: "Khóa Học Đa Dạng",
    description: "Khám phá nhiều khóa học phù hợp với nhu cầu học tập của bạn.",
    tone: "primary"
  },
  {
    title: "Bài Học Trực Tuyến",
    description: "Học mọi lúc, mọi nơi với nội dung được xây dựng trực quan và dễ tiếp cận.",
    tone: "blue"
  },
  {
    title: "Kiểm Tra & Đánh Giá",
    description: "Củng cố kiến thức thông qua các bài kiểm tra và đánh giá sau mỗi nội dung học tập.",
    tone: "rose"
  }
] as const;
