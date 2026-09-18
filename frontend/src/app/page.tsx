import { HomePage } from "@/features/home/home-page";
import { Suspense } from "react";

export default function Page() {
  return <Suspense fallback={<p className="p-8 text-muted" role="status">Đang tải trang chủ...</p>}><HomePage /></Suspense>;
}
