import Image from "next/image";
import Link from "next/link";

const footerColumns = [
  { title: "Sản phẩm", links: [["Trang Chủ", "/"], ["Khóa Học", "/#courses"], ["Tính Năng", "/#about"], ["Giảng Viên", "/#instructors"]] },
  { title: "Về EduAlto", links: [["Về Chúng tôi", "/#about"], ["Liên hệ", "/#contact"], ["Câu hỏi thường gặp", "/#contact"], ["Góp ý & hỗ trợ", "mailto:hello@edualto.vn"]] },
  { title: "Kết nối", links: [["Facebook", "mailto:hello@edualto.vn"], ["LinkedIn", "mailto:hello@edualto.vn"], ["GitHub", "mailto:hello@edualto.vn"], ["Email", "mailto:hello@edualto.vn"]] },
  { title: "Chính sách", links: [["Điều khoản sử dụng", "/#contact"], ["Chính sách bảo mật", "/#contact"], ["Chính sách cookie", "/#contact"]] }
];

export function Footer() {
  return (
    <footer className="bg-[#101828]">
      <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.15fr_2.6fr]">
        <div>
          <Image
            src="/images/logo-with-text.png"
            alt="EduAlto"
            width={180}
            height={72}
            className="h-16 w-auto object-contain brightness-0 invert"
          />
          <p className="mt-6 max-w-sm text-sm leading-7 text-slate-300">
            Nền tảng học tập hiện đại, đồng hành cùng bạn phát triển tri thức và kỹ năng.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-semibold text-slate-300">{column.title}</h2>
              <ul className="mt-4 space-y-3">
                {column.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-slate-400 transition hover:text-primary">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 EduAlto. Tất cả quyền được bảo lưu.</p>
          <p>Học tập bền vững, tiến bộ mỗi ngày.</p>
        </div>
      </div>
    </footer>
  );
}

