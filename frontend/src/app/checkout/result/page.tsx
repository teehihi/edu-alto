import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { CheckoutResultPage } from "@/features/commerce/checkout-result-page";

export const metadata = createPrivatePageMetadata("Kết quả thanh toán");

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <AppHeader />
      <Suspense fallback={null}>
        <CheckoutResultPage />
      </Suspense>
      <Footer />
    </div>
  );
}
