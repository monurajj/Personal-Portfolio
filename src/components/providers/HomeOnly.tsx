"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Renders its children on the home page only (the single-page portfolio). */
export function HomeOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname === "/" ? <>{children}</> : null;
}
