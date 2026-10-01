import { apiRequest } from "@/lib/api";

export type CourseCertificate = {
  id: string;
  certificateNumber: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
  instructorName: string;
  issuedAt: string;
};

export function fetchMyCertificates(accessToken: string) {
  return apiRequest<CourseCertificate[]>("/me/certificates", { accessToken });
}

export function fetchMyCourseCertificate(courseId: string, accessToken: string) {
  return apiRequest<CourseCertificate>(`/me/courses/${encodeURIComponent(courseId)}/certificate`, {
    accessToken,
  });
}
