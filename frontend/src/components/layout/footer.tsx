import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Facebook, Github, Linkedin } from "@/components/ui/social-icons";
import { CookieSettingsButton } from "@/components/layout/cookie-settings-button";

const footerColumns = [
  {
    title: "Sản phẩm",
    links: [
      ["Trang Chủ", "/"],
      ["Khóa Học", "/#courses"],
      ["Tính Năng", "/#about"],
      ["Giảng Viên", "/#instructors"],
    ],
  },
  {
    title: "Về EduAlto",
    links: [
      ["Về Chúng tôi", "/#about"],
      ["Liên hệ", "/#contact"],
      ["Câu hỏi thường gặp", "/#contact"],
      ["Góp ý & hỗ trợ", "mailto:dacsanviethotro@gmail.com"],
    ],
  },
  {
    title: "Kết nối",
    links: [
      ["Facebook", "https://www.facebook.com/nhatthien.nguyen.566"],
      ["LinkedIn", "https://www.linkedin.com/in/tee21/"],
      ["GitHub", "https://github.com/teehihi"],
      ["Email", "mailto:dacsanviethotro@gmail.com"],
    ],
  },
  {
    title: "Chính sách",
    links: [
      ["Điều khoản sử dụng", "/#contact"],
      ["Chính sách bảo mật", "/#contact"],
      ["Chính sách cookie", "/cookie-policy"],
    ],
  },
];

const socialLinks = [
  {
    label: "Facebook EduAlto",
    href: "https://www.facebook.com/nhatthien.nguyen.566",
    Icon: Facebook,
  },
  { label: "LinkedIn EduAlto", href: "https://www.linkedin.com/in/tee21/", Icon: Linkedin },
  { label: "GitHub EduAlto", href: "https://github.com/teehihi", Icon: Github },
  { label: "Gửi email cho EduAlto", href: "mailto:dacsanviethotro@gmail.com", Icon: Mail },
];

export const Footer = memo(function Footer() {
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
                    <Link
                      href={href}
                      className="text-sm text-slate-400 transition hover:text-primary"
                    >
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
          <CookieSettingsButton />
          <div className="flex items-center gap-4" aria-label="Kết nối với EduAlto">
            {socialLinks.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                className="rounded-md text-slate-400 transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#101828]"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </a>
            ))}
          </div>
          <p className="sm:text-right">Học tập bền vững, tiến bộ mỗi ngày.</p>
        </div>
      </div>
    </footer>
  );
});
