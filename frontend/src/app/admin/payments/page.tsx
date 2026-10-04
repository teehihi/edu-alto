import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { AdminPaymentsPage } from "@/features/admin/admin-payments-page";

export const metadata = createPrivatePageMetadata("Đối soát thanh toán");

export default function Page() {
  return <AdminPaymentsPage />;
}
