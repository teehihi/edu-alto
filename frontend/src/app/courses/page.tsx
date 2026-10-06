import { Suspense } from "react";
import { CourseCatalogPage } from "@/features/course/course-catalog-page";

export const instant = false;

export const metadata = {
  title: "Danh mục Khóa học | EduAlto",
  description: "Khám phá các khóa học chất lượng cao tại EduAlto với đa dạng chủ đề và cấp độ.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CourseCatalogPage />
    </Suspense>
  );
}
