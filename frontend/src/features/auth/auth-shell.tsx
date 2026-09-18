import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-footer to-white px-5 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-lg border border-footer-divider bg-white shadow-soft lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="hidden bg-footer-secondary p-10 lg:flex lg:flex-col lg:justify-between">
            <Link className="focus-ring w-fit rounded-lg text-2xl font-bold text-heading" href="/">
              EduAlto
            </Link>
            <div className="space-y-6">
              <div className="inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary shadow-xs">
                Học tập trực tuyến cho người Việt
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl font-bold leading-tight text-heading">
                  Tiếp tục hành trình học tập của bạn
                </h2>
                <p className="max-w-md text-base leading-7 text-muted">
                  Truy cập khóa học, theo dõi tiến độ và quản lý hồ sơ học tập trong một không gian rõ ràng, dễ dùng.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted">Bảo mật tài khoản là ưu tiên trong mọi bước xác thực.</p>
          </aside>

          <section className="px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
            <div className="mx-auto w-full max-w-md">
              <Link className="focus-ring mb-8 inline-flex rounded-lg text-xl font-bold text-heading lg:hidden" href="/">
                EduAlto
              </Link>
              <div className="mb-8 space-y-3">
                <p className="text-sm font-semibold text-primary">{eyebrow}</p>
                <h1 className="text-3xl font-bold tracking-normal text-heading sm:text-4xl">{title}</h1>
                <p className="text-sm leading-6 text-muted sm:text-base">{description}</p>
              </div>
              {children}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
