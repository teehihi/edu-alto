import type { Metadata } from "next";
import { AuthSessionProvider } from "@/lib/auth-session";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduAlto - Nền tảng học tập trực tuyến",
  description:
    "EduAlto giúp học viên Việt Nam khám phá khóa học, học bài, làm bài kiểm tra và theo dõi tiến độ học tập.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
