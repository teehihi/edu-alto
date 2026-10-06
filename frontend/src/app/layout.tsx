import type { Metadata, Viewport } from "next";
import { AuthSessionProvider } from "@/lib/auth-session";
import { LearningAssistant } from "@/components/learning-assistant";
import { CookieConsentManager } from "@/components/layout/cookie-consent-manager";
import { QueryProvider } from "@/lib/query-provider";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://edu-alto.vercel.app";

export const instant = false;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "EduAlto | Nền tảng học tập trực tuyến",
    template: "%s | EduAlto",
  },
  description:
    "EduAlto giúp học viên Việt Nam khám phá khóa học, học bài, làm bài kiểm tra và theo dõi tiến độ học tập.",
  applicationName: "EduAlto",
  authors: [{ name: "EduAlto" }],
  creator: "EduAlto",
  publisher: "EduAlto",
  category: "education",
  keywords: [
    "EduAlto",
    "học trực tuyến",
    "khóa học trực tuyến",
    "học tập trực tuyến",
    "nền tảng giáo dục Việt Nam",
  ],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "EduAlto",
    images: [
      { url: "/opengraph-image", width: 1200, height: 630, alt: "EduAlto — Học tập bền vững" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#20B486",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <QueryProvider>
          <AuthSessionProvider>
            {children}
            <LearningAssistant />
            <CookieConsentManager />
          </AuthSessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
