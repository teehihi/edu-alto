import { VerifyCertificatePage } from "@/features/certificate/verify-certificate-page";

export const metadata = {
  title: "Xác thực chứng chỉ điện tử | EduAlto",
  description:
    "Xác thực tính hợp lệ và thông tin chứng chỉ hoàn thành khóa học trên nền tảng EduAlto",
};

export default async function VerifyCertificateRoute({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <VerifyCertificatePage code={code} />;
}
