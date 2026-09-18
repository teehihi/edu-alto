export type Course = {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  duration: string;
  rating: number;
  reviewCount: string;
  instructor: string;
  instructorAvatar?: string;
  joinedAt: string;
  price: string;
  accent: "design" | "coding" | "vibe";
};

