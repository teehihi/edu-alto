import { apiPageRequest } from "@/lib/api";

export type InstructorCourseStudent = {
  studentId: string;
  studentName: string;
  email: string;
  enrolledAt: string;
};

export async function fetchInstructorCourseStudents(
  courseId: string,
  accessToken: string,
  page: number,
  search: string,
) {
  const params = new URLSearchParams({ page: String(page), size: "20" });
  if (search.trim()) params.set("search", search.trim());
  return apiPageRequest<InstructorCourseStudent>(
    `/instructor/courses/${encodeURIComponent(courseId)}/students?${params.toString()}`,
    { accessToken },
  );
}
