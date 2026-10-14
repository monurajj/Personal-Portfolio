"use client";

import { TextReveal } from "./TextReveal";
import { Reveal } from "./Reveal";
import { cn } from "@/lib/utils";

type Props = {
  index: string;
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
};

/** Editorial section opener: hairline rule, mono index, display title on a 12-col grid. */
export function SectionHeading({ index, eyebrow, title, description, className }: Props) {
  return (
    <div className={cn("rule grid gap-8 pt-6 lg:grid-cols-12", className)}>
      <Reveal className="flex items-baseline gap-4 lg:col-span-3">
        <span className="font-mono text-xs text-ink">{index}</span>
        <span className="eyebrow">{eyebrow}</span>
      </Reveal>
      <div className="lg:col-span-9">
        <TextReveal
          as="h2"
          text={title}
          className="font-display text-[clamp(2.4rem,5.6vw,5.2rem)] font-medium leading-[0.98] text-ink"
        />
        {description && (
          <Reveal delay={0.15} className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            {description}
          </Reveal>
        )}
      </div>
    </div>
  );
}
