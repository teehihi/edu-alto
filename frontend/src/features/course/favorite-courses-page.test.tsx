import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FavoriteCoursesPage } from "./favorite-courses-page";
import * as favoritesModule from "@/lib/favorites";

const getAccessToken = vi.fn().mockResolvedValue("test-token");
let mockUser: { id: string; fullName: string; roles: string[] } | null = null;

vi.mock("@/components/layout/app-header", () => ({
  AppHeader: () => <header data-testid="app-header">EduAlto Header</header>,
}));

vi.mock("@/components/layout/footer", () => ({
  Footer: () => <footer data-testid="footer">EduAlto Footer</footer>,
}));

vi.mock("@/lib/auth-session", () => ({
  useAuthSession: () => ({
    user: mockUser,
    isLoading: false,
    getAccessToken,
  }),
}));

const mockCourse: favoritesModule.FavoriteCourse = {
  id: "course-fav-1",
  slug: "react-nang-cao",
  title: "React Nâng Cao",
  instructor: "Trần Bình",
  rating: 0,
  reviewCount: 0,
  totalHours: 0,
  lecturesCount: 0,
  level: "Nâng cao",
  price: 499000,
  image: "/images/course.png",
};

describe("FavoriteCoursesPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUser = null;
    vi.clearAllMocks();
  });

  it("renders empty state for guest when no favorites are saved without infinite loop", () => {
    render(<FavoriteCoursesPage />);

    expect(screen.getByText("Khóa học yêu thích")).toBeInTheDocument();
    expect(screen.getByText("Bạn chưa lưu khóa học nào")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Khám phá khóa học" })).toBeInTheDocument();
  });

  it("renders cached favorite courses for guest immediately", () => {
    favoritesModule.toggleFavoriteCourse(mockCourse);

    render(<FavoriteCoursesPage />);

    expect(screen.getByText("React Nâng Cao")).toBeInTheDocument();
    expect(screen.queryByText("Bạn chưa lưu khóa học nào")).not.toBeInTheDocument();
  });

  it("loads and displays remote favorites for logged-in students", async () => {
    mockUser = { id: "student-1", fullName: "Học Viên", roles: ["STUDENT"] };
    vi.spyOn(favoritesModule, "fetchFavoriteCourses").mockResolvedValue([mockCourse]);
    vi.spyOn(favoritesModule, "loadFavoriteCoursesForUser").mockResolvedValue(
      new Set([mockCourse.id]),
    );

    render(<FavoriteCoursesPage />);

    await waitFor(() => {
      expect(screen.getByText("React Nâng Cao")).toBeInTheDocument();
    });
  });
});
