import {
  BookOpen,
  BookmarkCheck,
  CalendarDays,
  ClipboardList,
  FolderClosed,
  Home,
  MessageCircle,
  NotebookPen,
  Sparkles,
} from "lucide-react";

export type LearningPortalView =
  | "overview"
  | "courses"
  | "certificates"
  | "savedLessons"
  | "assignments"
  | "calendar"
  | "discussion"
  | "resources"
  | "notes"
  | "messages"
  | "teachers"
  | "reviews";

export const learningNavigationGroups = [
  {
    title: "KHÔNG GIAN HỌC",
    links: [
      { label: "Tổng quan", href: "/learning", view: "overview", icon: Home },
      {
        label: "Khóa học của tôi",
        href: "/learning/courses",
        view: "courses",
        icon: BookOpen,
      },
      {
        label: "Thời khóa biểu",
        href: "/learning/calendar",
        view: "calendar",
        icon: CalendarDays,
      },
    ],
  },
  {
    title: "TƯƠNG TÁC & BÀI TẬP",
    links: [
      {
        label: "Bài tập",
        href: "/learning/assignments",
        view: "assignments",
        icon: ClipboardList,
      },
      {
        label: "Thảo luận",
        href: "/learning/discussion",
        view: "discussion",
        icon: MessageCircle,
      },
    ],
  },
  {
    title: "LƯU TRỮ & THÀNH TÍCH",
    links: [
      {
        label: "Bài học đã lưu",
        href: "/learning/saved-lessons",
        view: "savedLessons",
        icon: BookmarkCheck,
      },
      { label: "Ghi chú", href: "/learning/notes", view: "notes", icon: NotebookPen },
      {
        label: "Tài liệu",
        href: "/learning/resources",
        view: "resources",
        icon: FolderClosed,
      },
      {
        label: "Chứng chỉ của tôi",
        href: "/learning/certificates",
        view: "certificates",
        icon: Sparkles,
      },
    ],
  },
] as const;
