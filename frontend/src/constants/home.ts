import type { Course } from "@/types/course";

export const popularCourses: Course[] = [
  {
    id: "ui-design-foundation",
    title: "Thiết kế giao diện cơ bản",
    category: "Thiết kế",
    description: "Làm quen với bố cục, màu sắc, typography và cách chuẩn bị giao diện rõ ràng cho sản phẩm học tập.",
    duration: "08 giờ 12 phút",
    rating: 0,
    reviewCount: "Chưa có đánh giá",
    instructor: "Đội ngũ EduAlto",
    joinedAt: "Nội dung mẫu",
    price: "500.000đ",
    accent: "design"
  },
  {
    id: "programming-basic",
    title: "Nhập môn lập trình",
    category: "Lập trình",
    description: "Xây dựng tư duy giải quyết vấn đề qua bài học ngắn, ví dụ dễ hiểu và bài luyện tập sau mỗi phần.",
    duration: "06 giờ 30 phút",
    rating: 0,
    reviewCount: "Chưa có đánh giá",
    instructor: "Đội ngũ EduAlto",
    joinedAt: "Nội dung mẫu",
    price: "690.000đ",
    accent: "coding"
  },
  {
    id: "academic-writing",
    title: "Kỹ năng viết học thuật",
    category: "Học thuật",
    description: "Rèn cách đọc tài liệu, lập dàn ý, trích dẫn và trình bày bài viết mạch lạc trong môi trường đại học.",
    duration: "04 giờ 45 phút",
    rating: 0,
    reviewCount: "Chưa có đánh giá",
    instructor: "Đội ngũ EduAlto",
    joinedAt: "Nội dung mẫu",
    price: "360.000đ",
    accent: "ai"
  }
];

export const features = [
  {
    title: "Khóa học đa dạng",
    description: "Khám phá nhiều chủ đề học tập với nội dung được chia nhỏ để dễ theo dõi.",
    tone: "primary"
  },
  {
    title: "Bài học trực tuyến",
    description: "Học theo nhịp độ của bạn với bài học, tài liệu và hoạt động luyện tập rõ ràng.",
    tone: "blue"
  },
  {
    title: "Kiểm tra và đánh giá",
    description: "Củng cố kiến thức bằng bài kiểm tra, phản hồi và trạng thái hoàn thành sau mỗi chặng.",
    tone: "rose"
  }
] as const;
