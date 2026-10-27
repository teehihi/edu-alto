import { apiBlobRequest, apiRequest } from "@/lib/api";

export type CourseCertificate = {
  id: string;
  certificateNumber: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
  instructorName: string;
  issuedAt: string;
  verificationUrl?: string;
  qrCodeDataUrl?: string;
};

export type CertificateVerificationResult = {
  certificateNumber: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
  instructorName: string;
  issuedAt: string;
  isValid: boolean;
  verificationUrl: string;
  qrCodeDataUrl: string;
};

export function fetchMyCertificates(accessToken: string) {
  return apiRequest<CourseCertificate[]>("/me/certificates", { accessToken });
}

export function fetchMyCourseCertificate(courseId: string, accessToken: string, baseUrl?: string) {
  const query = baseUrl ? `?baseUrl=${encodeURIComponent(baseUrl)}` : "";
  return apiRequest<CourseCertificate>(
    `/me/courses/${encodeURIComponent(courseId)}/certificate${query}`,
    {
      accessToken,
    },
  );
}

export function downloadCertificatePdf(courseId: string, accessToken: string, baseUrl?: string) {
  const query = baseUrl ? `?baseUrl=${encodeURIComponent(baseUrl)}` : "";
  return apiBlobRequest(`/me/courses/${encodeURIComponent(courseId)}/certificate/pdf${query}`, {
    accessToken,
  });
}

export function verifyCertificate(certificateNumber: string) {
  return apiRequest<CertificateVerificationResult>(
    `/certificates/verify/${encodeURIComponent(certificateNumber)}`,
  );
}

export function downloadPublicCertificatePdf(certificateNumber: string) {
  return apiBlobRequest(`/certificates/${encodeURIComponent(certificateNumber)}/pdf`);
}
