"use client";

import type { ReactNode } from "react";
import { InstructorWorkspaceShell } from "@/features/instructor/instructor-workspace-shell";

export function InstructorLayoutClient({ children }: { children: ReactNode }) {
  return <InstructorWorkspaceShell>{children}</InstructorWorkspaceShell>;
}
