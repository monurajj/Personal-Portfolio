"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Plus } from "lucide-react";
import { experience, site } from "@/lib/data";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Experience() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="experience" className="relative py-28 sm:py-40">
      <div className="container-x">
        <SectionHeading
          index="02"
          eyebrow="Experience"
          title="Where I've *built.*"
          description="Startups, a research lab and client work. Each one taught me a different kind of engineering."
        />

        <Reveal className="mt-20">
          <ol className="rule">
            {experience.map((job, i) => {
              const isOpen = open === i;
              return (
                <li key={job.company} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`exp-${i}`}
                    className="group grid w-full grid-cols-12 items-baseline gap-x-4 py-6 text-left transition-colors duration-300 hover:text-ink sm:py-8"
                  >
                    <span className="col-span-12 font-mono text-xs text-muted sm:col-span-2">{job.period}</span>
                    <span className="col-span-10 font-display text-2xl font-medium tracking-tight text-ink sm:col-span-5 sm:text-3xl">
                      {job.role}
                    </span>
                    <span className="col-span-10 col-start-1 mt-1 text-sm text-muted sm:col-span-4 sm:col-start-8 sm:mt-0 sm:text-base">
                      {job.company}
                    </span>
                    <span className="col-span-2 col-start-11 row-start-2 justify-self-end sm:col-start-12 sm:row-start-1">
                      <Plus
                        className={cn(
                          "size-5 text-muted transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:text-ink",
                          isOpen && "rotate-45",
                        )}
                        strokeWidth={1.5}
                      />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`exp-${i}`}
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.6, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-12 gap-x-4 pb-10">
                          <div className="col-span-12 sm:col-span-5 sm:col-start-3">
                            {job.affiliation && <p className="eyebrow mb-3">{job.affiliation}</p>}
                            <p className="text-base leading-relaxed text-ink/85">{job.summary}</p>
                            {job.link && (
                              <a
                                href={job.link}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="link-draw mt-5 inline-flex items-center gap-1 text-sm text-ink"
                              >
                                Visit {job.company}
                                <ArrowUpRight className="size-3.5" />
                              </a>
                            )}
                          </div>
                          <div className="col-span-12 mt-6 sm:col-span-4 sm:col-start-8 sm:mt-0">
                            <p className="eyebrow mb-3">Scope</p>
                            <ul className="space-y-2">
                              {job.scope.map((s) => (
                                <li key={s} className="flex gap-3 text-sm leading-relaxed text-muted">
                                  <span className="mt-[11px] h-px w-3 shrink-0 bg-dim" />
                                  {s}
                                </li>
                              ))}
                            </ul>
                            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
                              {job.tags.join(" · ")}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ol>
        </Reveal>

        <Reveal delay={0.1} className="mt-8 flex justify-end">
          <a
            href={site.links.resume}
            target="_blank"
            rel="noreferrer noopener"
            className="link-draw inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted hover:text-ink"
          >
            Download résumé <ArrowUpRight className="size-3.5" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
