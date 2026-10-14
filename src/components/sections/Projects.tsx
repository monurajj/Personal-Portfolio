"use client";

import { useState, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { projects } from "@/lib/data";
import { useFinePointer } from "@/lib/hooks";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { ProjectArt } from "./ProjectArt";

/**
 * Numbered vertical list, Swiss-grid style: oversized index on the left,
 * a heavy rule over the content, title + category in a narrow column and the
 * case text in a wide one. Hovering a row (fine pointers) floats its artwork
 * beside the cursor; touch devices get the artwork inline.
 */
export function Projects() {
  const fine = useFinePointer();
  const [active, setActive] = useState<number | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 140, damping: 20, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 140, damping: 20, mass: 0.6 });

  const onMove = (e: MouseEvent) => {
    x.set(e.clientX);
    y.set(e.clientY);
  };

  return (
    <section id="projects" className="relative py-28 sm:py-40">
      <div className="container-x">
        <SectionHeading
          index="03"
          eyebrow="Selected work"
          title="From *prototype* to product."
          description="Four pieces of work that best show how I build: products, prototypes and communities."
        />

        <ol className="mt-24" onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
          {projects.map((p, i) => (
            <li
              key={p.slug}
              onMouseEnter={() => setActive(i)}
              className="grid gap-x-8 gap-y-8 py-16 first:pt-0 lg:grid-cols-12 lg:py-24"
            >
              {/* Index */}
              <div className="lg:col-span-4">
                <Reveal>
                  <span className="block font-display text-[clamp(5.5rem,13vw,12.5rem)] font-semibold leading-[0.8] tracking-[-0.06em] text-ink lg:sticky lg:top-32">
                    {p.index}
                  </span>
                </Reveal>
              </div>

              {/* Content */}
              <Reveal delay={0.1} className="border-t-[3px] border-ink pt-7 lg:col-span-8">
                <div className="grid gap-10 md:grid-cols-8">
                  <div className="md:col-span-3">
                    <h3 className="font-display text-[1.9rem] font-semibold leading-[1.05] tracking-tight text-ink">
                      {p.title}
                    </h3>
                    <p className="mt-4 text-sm text-ink">{p.category}</p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{p.status}</p>
                    {p.link ? (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        data-cursor-label="Open"
                        className="link-draw mt-8 inline-flex items-center gap-1 text-sm text-ink"
                      >
                        Visit {p.title}
                        <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                      </a>
                    ) : (
                      <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">Private work</p>
                    )}
                  </div>

                  <div className="md:col-span-5">
                    <p className="text-base leading-relaxed text-muted">{p.description}</p>
                    <ul className="mt-6 space-y-1.5">
                      {p.highlights.map((h) => (
                        <li key={h} className="flex gap-3 text-sm text-ink">
                          <span className="mt-[10px] h-px w-3 shrink-0 bg-ink" />
                          {h}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 font-mono text-[11px] uppercase leading-loose tracking-[0.14em] text-dim">
                      {p.tags.join(" · ")}
                    </p>
                    {!fine && (
                      <div className="mt-8 aspect-[16/10] overflow-hidden">
                        <ProjectArt art={p.art} />
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>

      {/* Cursor-following preview, desktop only */}
      {fine && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[40] hidden aspect-[16/10] w-[20rem] overflow-hidden lg:block"
          style={{ x: sx, y: sy, translateX: "2.5rem", translateY: "-50%" }}
          animate={{ opacity: active !== null ? 1 : 0, scale: active !== null ? 1 : 0.94 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {projects.map((p, i) => (
            <motion.div
              key={p.slug}
              className="absolute inset-0"
              animate={{ opacity: active === i ? 1 : 0 }}
              transition={{ duration: 0.35 }}
            >
              <ProjectArt art={p.art} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
