import type { Metadata } from "next";

export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LearningLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
