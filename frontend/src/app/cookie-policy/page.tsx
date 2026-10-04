import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Chính sách cookie",
  description: "Tìm hiểu cách EduAlto sử dụng cookie thiết yếu và quản lý lựa chọn quyền riêng tư.",
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f5fbf9] text-[#101a2c]">
      <AppHeader />
      <main className="container-page flex-1 py-12 sm:py-16">
        <article className="mx-auto max-w-3xl rounded-2xl border border-[#e5ede9] bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold text-[#168f6c]">EDUALTO · QUYỀN RIÊNG TƯ</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Chính sách cookie</h1>
          <p className="mt-4 text-sm leading-7 text-[#667085]">
            Chính sách này giải thích dữ liệu nào được lưu trong cookie hoặc bộ nhớ trình duyệt khi
            bạn dùng EduAlto. Cập nhật ngày 4 tháng 10 năm 2026.
          </p>

          <div className="mt-8 space-y-7 text-sm leading-7 text-[#475467]">
            <section>
              <h2 className="text-lg font-semibold text-[#101a2c]">Cookie là gì?</h2>
              <p className="mt-2">
                Cookie là một mẩu dữ liệu nhỏ mà trang web lưu trong trình duyệt. EduAlto dùng
                cookie cần thiết để duy trì phiên đăng nhập và ghi nhớ lựa chọn cookie của bạn.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-[#101a2c]">Cookie EduAlto đang sử dụng</h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <strong>Phiên đăng nhập:</strong> máy chủ xác thực dùng cookie bảo vệ để duy trì
                  phiên và làm mới quyền truy cập. Cookie này do máy chủ đặt, không đọc được bằng
                  JavaScript và sẽ hết hạn theo phiên tài khoản.
                </li>
                <li>
                  <strong>Lựa chọn cookie:</strong> cookie{" "}
                  <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 text-xs">
                    edualto-cookie-consent
                  </code>{" "}
                  lưu việc bật/tắt cookie tùy chọn trong 180 ngày để banner không xuất hiện lại sau
                  mỗi lần truy cập.
                </li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-[#101a2c]">Lưu trữ trên trình duyệt</h2>
              <p className="mt-2">
                Giỏ hàng và danh sách khóa học yêu thích của khách có thể được lưu bằng localStorage
                trên thiết bị. Đây là bộ nhớ trình duyệt, không phải cookie. Khi đăng nhập, danh
                sách yêu thích được đồng bộ với tài khoản.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-[#101a2c]">Cookie tùy chọn</h2>
              <p className="mt-2">
                Bạn có thể từ chối cookie phân tích và tiếp thị. EduAlto hiện chưa bật công cụ phân
                tích hoặc quảng cáo bên thứ ba; thay đổi lựa chọn của bạn có hiệu lực ngay với các
                tích hợp tùy chọn nếu chúng được thêm sau này.
              </p>
            </section>
            <section id="cai-dat">
              <h2 className="text-lg font-semibold text-[#101a2c]">Thay đổi lựa chọn</h2>
              <p className="mt-2">
                Mở cài đặt bất cứ lúc nào từ liên kết ở cuối trang. Bạn cũng có thể xóa cookie trong
                phần cài đặt trình duyệt; sau đó banner lựa chọn sẽ hiển thị lại.
              </p>
              <Link
                href="/"
                className="focus-ring mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#20b486] px-4 font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
              >
                Về trang chủ và mở cài đặt ở cuối trang
              </Link>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
