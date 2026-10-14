"use client";

import type { ComponentProps, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Magnetic } from "./Magnetic";

type Variant = "primary" | "ghost";

type Props = Omit<ComponentProps<"a">, "children"> & {
  children: ReactNode;
  variant?: Variant;
  icon?: boolean;
  magnetic?: boolean;
};

export function Button({ children, variant = "primary", icon = true, magnetic = true, className, ...rest }: Props) {
  const inner = (
    <a
      {...rest}
      className={cn(
        "group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-6 py-3.5 text-sm font-medium tracking-tight transition-colors duration-500",
        variant === "primary" ? "bg-ink text-bg" : "border border-line-strong text-ink hover:border-ink",
        className,
      )}
    >
      {variant === "primary" && (
        <span
          aria-hidden
          className="absolute inset-0 translate-y-full rounded-full bg-accent transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0"
        />
      )}
      <span className="relative z-10">{children}</span>
      {icon && (
        <ArrowUpRight
          className="relative z-10 size-4 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          strokeWidth={1.75}
        />
      )}
    </a>
  );
  return magnetic ? <Magnetic strength={0.25}>{inner}</Magnetic> : inner;
}
