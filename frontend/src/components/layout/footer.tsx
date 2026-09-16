import Image from "next/image";
import Link from "next/link";

const footerColumns = [
  { title: "Nền tảng", links: ["Khóa học", "Bài học", "Tài liệu", "Lịch học"] },
  { title: "Hỗ trợ", links: ["Trung tâm trợ giúp", "Liên hệ", "Câu hỏi thường gặp", "Cộng đồng"] },
  { title: "EduAlto", links: ["Về chúng tôi", "Giảng viên", "Điều khoản", "Bảo mật"] }
];

export function Footer() {
  return (
    <footer className="mt-20 bg-footer">
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Image src="/images/logo-with-text.png" alt="EduAlto" width={180} height={72} className="h-16 w-auto object-contain" />
          <p className="mt-6 max-w-sm text-sm leading-6 text-muted">
            Nền tảng học tập trực tuyến giúp bạn phát triển kỹ năng, theo dõi tiến độ và kết nối với cộng đồng học tập.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-semibold text-ink">{column.title}</h2>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-sm text-muted transition hover:text-primary">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-footer-divider">
        <div className="container-page flex flex-col gap-3 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 EduAlto. Tất cả quyền được bảo lưu.</p>
          <p>Học tập bền vững, tiến bộ mỗi ngày.</p>
        </div>
      </div>
    </footer>
  );
}
