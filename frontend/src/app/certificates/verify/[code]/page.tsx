import type { Metadata } from "next";
import { VerifyCertificatePage } from "@/features/certificate/verify-certificate-page";
import type { CertificateVerificationResult } from "@/lib/certificate-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Xác thực chứng chỉ ${code} | EduAlto`,
    description: `Kiểm tra tính xác thực, danh tính học viên và ngày cấp chứng chỉ ${code} trên hệ thống EduAlto.`,
    openGraph: {
      title: `Xác thực chứng chỉ ${code} — EduAlto`,
      description: `Bất kỳ ai quét mã QR trên bằng cấp đều có thể kiểm tra danh tính học viên và ngày cấp chính thức.`,
    },
  };
}

async function getCertificate(code: string): Promise<CertificateVerificationResult | null> {
  const backendBase = process.env.INTERNAL_BACKEND_URL || "http://localhost:8080/api/v1";
  try {
    const res = await fetch(`${backendBase}/certificates/verify/${encodeURIComponent(code)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success && json.data ? (json.data as CertificateVerificationResult) : null;
  } catch {
    return null;
  }
}

export default async function VerifyCertificateRoute({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const initialData = await getCertificate(code);
  return <VerifyCertificatePage code={code} initialData={initialData} />;
}
