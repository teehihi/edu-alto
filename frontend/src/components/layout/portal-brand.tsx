import Image from "next/image";
import Link from "next/link";

export function PortalBrand({
  roleLabel,
  onNavigate,
  tone = "light",
}: {
  roleLabel: string;
  onNavigate?: () => void;
  tone?: "light" | "dark";
}) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className="focus-ring inline-flex min-w-0 items-center gap-2.5 rounded-lg transition active:scale-[0.98]"
      aria-label="EduAlto, về trang chủ"
    >
      <Image
        src="/images/about/source/logo.png"
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 object-contain"
        priority
      />
      <span className="flex min-w-0 flex-col items-start gap-0.5">
        <Image
          src={
            tone === "dark" ? "/images/about/source/lightAlto.png" : "/images/edualto-wordmark.png"
          }
          alt=""
          width={150}
          height={33}
          className="h-6 w-auto object-contain object-left"
          priority
        />
        <span
          className={`pl-1 text-[10px] font-medium leading-none ${tone === "dark" ? "text-slate-300" : "text-slate-500"}`}
        >
          {roleLabel}
        </span>
      </span>
    </Link>
  );
}
