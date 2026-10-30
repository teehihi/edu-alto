import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthSessionProvider } from "@/lib/auth-session";
import { LearningAssistant } from "@/components/learning-assistant";
import { CookieConsentManager } from "@/components/layout/cookie-consent-manager";
import { QueryProvider } from "@/lib/query-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://edualto.vercel.app";

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
      {
        url: "/images/metadata_img.png",
        width: 1672,
        height: 941,
        alt: "EduAlto — Nền tảng học tập trực tuyến",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/metadata_img.png"],
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
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      className={inter.variable}
      suppressHydrationWarning
    >
      <body className={`${inter.className} font-sans antialiased`} suppressHydrationWarning>
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
