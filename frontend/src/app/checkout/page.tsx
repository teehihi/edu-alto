import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { CheckoutPage } from "@/features/commerce/checkout-page";

export const metadata = createPrivatePageMetadata("Thanh toán");

export default function Page() {
  return <CheckoutPage />;
}
