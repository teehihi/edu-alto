import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { CartPage } from "@/features/commerce/cart-page";

export const metadata = createPrivatePageMetadata("Giỏ hàng");

export default function Page() {
  return <CartPage />;
}
