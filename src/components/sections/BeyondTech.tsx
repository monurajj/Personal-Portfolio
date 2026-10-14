"use client";

import { ArrowUpRight } from "lucide-react";
import { beyond, milestones } from "@/lib/data";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export function BeyondTech() {
  return (
    <section id="beyond" className="relative py-28 sm:py-40">
      <div className="container-x">
        <SectionHeading
          index="05"
          eyebrow="Beyond tech"
          title="Building for *other people,* too."
          description="An NGO, a foundation and a village election. The work that shaped me as much as any codebase."
        />

        <div className="mt-20 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {beyond.map((b, i) => (
            <Reveal key={b.title} delay={i * 0.07} className="rule flex flex-col pt-5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="shrink-0 font-mono text-xs text-dim">0{i + 1}</span>
                <span className="eyebrow text-right">{b.kicker}</span>
              </div>
              <h3 className="mt-8 font-display text-2xl font-medium tracking-tight text-ink">{b.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{b.body}</p>
              {b.bullets && (
                <p className="mt-4 font-mono text-[11px] uppercase leading-loose tracking-[0.14em] text-dim">
                  {b.bullets.join(" · ")}
                </p>
              )}
              {b.link && (
                <a
                  href={b.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-draw mt-auto inline-flex items-center gap-1 pt-6 text-sm text-ink"
                >
                  Visit <ArrowUpRight className="size-3.5" />
                </a>
              )}
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-24 grid gap-8 rule pt-6 lg:grid-cols-12">
          <p className="eyebrow lg:col-span-3">Milestones</p>
          <ol className="grid gap-x-12 lg:col-span-9 md:grid-cols-2">
            {milestones.map((m, i) => (
              <li key={m} className="flex gap-4 border-b border-line py-3 text-sm leading-relaxed text-ink/85">
                <span className="font-mono text-xs text-dim tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                {m}
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
