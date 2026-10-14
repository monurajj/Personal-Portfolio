"use client";

import { skills, techMarquee, builtWith } from "@/lib/data";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Marquee } from "@/components/ui/Marquee";

export function Skills() {
  return (
    <section id="skills" className="relative py-20 sm:py-40">
      <div className="container-x">
        <SectionHeading
          index="04"
          eyebrow="Capabilities"
          title="Software first. *Hardware, product and people* alongside."
          description="An honest list of what I have actually used to build and ship, grouped by the kind of problem it solves."
        />

        <div className="mt-20">
          {skills.map((g, i) => (
            <Reveal key={g.title} delay={i * 0.05} className="rule grid gap-6 py-8 lg:grid-cols-12 lg:gap-4">
              <span className="font-mono text-xs text-dim lg:col-span-1">0{i + 1}</span>
              <div className="lg:col-span-4">
                <h3 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">{g.title}</h3>
                <p className="mt-2 text-sm text-muted">{g.blurb}</p>
              </div>
              <ul className="flex flex-wrap gap-x-3 gap-y-2 lg:col-span-7">
                {g.items.map((item, j) => (
                  <li key={item} className="text-base text-ink/85 sm:text-lg">
                    {item}
                    {j < g.items.length - 1 && <span className="ml-3 text-dim">/</span>}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
          <div className="rule" />
        </div>

        <Reveal className="mt-10 flex flex-wrap items-baseline justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
          <p>This site: {builtWith.join(" / ")}</p>
          <p>WebGL · scroll-linked motion · built from scratch</p>
        </Reveal>
      </div>

      <div className="mt-14 space-y-6 rule py-8 sm:mt-24">
        <Marquee items={techMarquee} alternate={false} />
        <Marquee items={[...techMarquee].reverse()} reverse alternate />
      </div>
    </section>
  );
}
