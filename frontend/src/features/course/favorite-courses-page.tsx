"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { FigmaCourseCard } from "@/features/course/course-catalog-page";
import { useAuthSession } from "@/lib/auth-session";
import { CourseCardSkeleton } from "@/components/ui/skeleton";
import {
  fetchFavoriteCourses,
  loadFavoriteCoursesForUser,
  readFavoriteCourses,
  subscribeToFavoriteCourses,
  type FavoriteCourse,
} from "@/lib/favorites";

export function FavoriteCoursesPage() {
  const { user, getAccessToken, isLoading: authLoading } = useAuthSession();
  const userId = user?.roles.includes("STUDENT") ? user.id : null;

  const guestCourses = useSyncExternalStore(
    subscribeToFavoriteCourses,
    readFavoriteCourses,
    () => [],
  );
  const [remoteCourses, setRemoteCourses] = useState<FavoriteCourse[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");

  const courses = userId ? remoteCourses : guestCourses;

  useEffect(() => {
    if (authLoading || !userId) return;
    let active = true;
    setLoading(true);
    void getAccessToken()
      .then(async (token) => {
        if (!token) throw new Error("Vui lòng đăng nhập lại để xem khóa học đã lưu.");
        await loadFavoriteCoursesForUser(userId, token);
        return fetchFavoriteCourses(token);
      })
      .then((favorites) => {
        if (!active) return;
        setRemoteCourses(favorites);
        setError("");
      })
      .catch(() => {
        if (!active) return;
        setError("Không thể tải danh sách yêu thích. Vui lòng thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, getAccessToken, userId]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="bg-gradient-to-b from-[#e6f7f2] to-white">
        <AppHeader />
      </div>
      <main className="container-page flex-1 py-8 md:py-10">
        <h1 className="text-2xl font-bold text-[#101a2c] md:text-3xl">Khóa học yêu thích</h1>
        <p className="mt-2 text-sm text-[#667085]">Những khóa học bạn đã lưu để xem lại sau.</p>

        {loading ? (
          <div
            className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Đang tải danh sách khóa học yêu thích"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <section
            className="mt-8 rounded-xl border border-rose-200 bg-rose-50 px-5 py-8 text-center text-sm text-rose-700"
            role="alert"
          >
            {error}
          </section>
        ) : courses.length ? (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <FigmaCourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <section className="mt-8 rounded-xl border border-dashed border-[#dce8e2] bg-[#fbfefc] px-5 py-14 text-center">
            <Heart className="mx-auto h-9 w-9 text-primary" />
            <h2 className="mt-3 text-lg font-semibold text-[#101a2c]">Bạn chưa lưu khóa học nào</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
              Chọn biểu tượng trái tim trên khóa học để thêm vào danh sách này.
            </p>
            <Link
              href="/courses"
              className="focus-ring mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75]"
            >
              Khám phá khóa học
            </Link>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
