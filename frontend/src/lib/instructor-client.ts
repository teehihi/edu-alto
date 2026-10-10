import { apiPageRequest } from "@/lib/api";
import type { PublicInstructor } from "@/types/instructor";

export type PublicInstructorQueryParams = {
  page?: number;
  size?: number;
};

export async function fetchPublicInstructorPage(params: PublicInstructorQueryParams = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.size !== undefined) query.set("size", String(params.size));
  const queryString = query.toString();

  return apiPageRequest<PublicInstructor>(`/instructors${queryString ? `?${queryString}` : ""}`);
}
