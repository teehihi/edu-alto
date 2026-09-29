import { Suspense } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { CheckoutResultPage } from "@/features/commerce/checkout-result-page";

export const metadata = { title: "Kết quả thanh toán | EduAlto" };

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <AppHeader />
      <Suspense fallback={<main className="container-page min-h-[65vh] py-12" />}>
        <CheckoutResultPage />
      </Suspense>
      <Footer />
    </div>
  );
}
