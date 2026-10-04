import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://edu-alto.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/cart",
        "/checkout",
        "/forgot-password",
        "/instructor",
        "/learning",
        "/login",
        "/profile",
        "/register",
        "/reset-password",
        "/verify-email",
      ],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
