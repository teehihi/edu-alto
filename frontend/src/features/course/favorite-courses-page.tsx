"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { FigmaCourseCard } from "@/features/course/course-catalog-page";
import {
  readFavoriteCourses,
  subscribeToFavoriteCourses,
  type FavoriteCourse,
} from "@/lib/favorites";

export function FavoriteCoursesPage() {
  const [courses, setCourses] = useState<FavoriteCourse[]>([]);

  useEffect(() => {
    const sync = () => setCourses(readFavoriteCourses());
    sync();
    return subscribeToFavoriteCourses(sync);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="bg-gradient-to-b from-[#e6f7f2] to-white">
        <AppHeader />
      </div>
      <main className="container-page flex-1 py-8 md:py-10">
        <h1 className="text-2xl font-bold text-[#101a2c] md:text-3xl">Khóa học yêu thích</h1>
        <p className="mt-2 text-sm text-[#667085]">Những khóa học bạn đã lưu để xem lại sau.</p>

        {courses.length ? (
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
