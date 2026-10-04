import type { Metadata } from "next";

export function createPrivatePageMetadata(title: string): Metadata {
  return { title, robots: { index: false, follow: false } };
}
