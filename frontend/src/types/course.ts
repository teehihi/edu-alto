export type CourseLevel = "ALL_LEVELS" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type CourseInstructorSummary = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  headline: string | null;
  customHandle: string | null;
};

export type CourseListItem = {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  thumbnailUrl: string | null;
  price: number;
  originalPrice: number | null;
  level: CourseLevel;
  language: string;
  status: CourseStatus;
  publishedAt: string | null;
  instructor: CourseInstructorSummary | null;
};

export type CourseDetail = {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  description: string;
  thumbnailUrl: string | null;
  price: number;
  originalPrice: number | null;
  level: CourseLevel;
  language: string;
  status: CourseStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  instructor: CourseInstructorSummary | null;
};

// Legacy Course type support for homepage demo items
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
