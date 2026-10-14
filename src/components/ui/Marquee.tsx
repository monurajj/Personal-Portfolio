import { cn } from "@/lib/utils";

type Props = {
  items: readonly string[];
  reverse?: boolean;
  className?: string;
  /** Set every other item in the italic serif face. */
  alternate?: boolean;
};

/** Infinite horizontal ticker. Content is duplicated so the loop is seamless. */
export function Marquee({ items, reverse, className, alternate = true }: Props) {
  const row = [...items, ...items];
  return (
    <div className={cn("mask-fade-x group relative flex w-full overflow-hidden", className)} aria-label={items.join(", ")}>
      <div
        className={cn(
          "flex w-max shrink-0 items-baseline gap-12 pr-12 will-change-transform group-hover:[animation-play-state:paused]",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
        )}
      >
        {row.map((item, i) => (
          <div key={`${item}-${i}`} className="flex items-baseline gap-12" aria-hidden={i >= items.length}>
            <span
              className={cn(
                "whitespace-nowrap text-3xl leading-none text-ink sm:text-5xl",
                alternate && i % 2 ? "serif" : "font-display font-medium tracking-tight",
              )}
            >
              {item}
            </span>
            <span className="size-1.5 rounded-full bg-dim" />
          </div>
        ))}
      </div>
    </div>
  );
}
