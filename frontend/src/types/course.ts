export type Course = {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  rating: number;
  reviewCount: string;
  instructor: string;
  joinedAt: string;
  price: string;
  accent: "design" | "coding" | "ai";
};
