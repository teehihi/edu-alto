import type { Metadata } from "next";
import { InstructorLayoutClient } from "./instructor-layout-client";

export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function InstructorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <InstructorLayoutClient>{children}</InstructorLayoutClient>;
}
