import type { Metadata } from "next";
import { AuthSessionProvider } from "@/lib/auth-session";
import { LearningAssistant } from "@/components/learning-assistant";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduAlto - Nền tảng học tập trực tuyến",
  description:
    "EduAlto giúp học viên Việt Nam khám phá khóa học, học bài, làm bài kiểm tra và theo dõi tiến độ học tập.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AuthSessionProvider>
          {children}
          <LearningAssistant />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
