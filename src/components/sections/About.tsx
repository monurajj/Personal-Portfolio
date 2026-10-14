"use client";

import { about } from "@/lib/data";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Marquee } from "@/components/ui/Marquee";

export function About() {
  return (
    <section id="about" className="relative py-20 sm:py-40">
      <div className="container-x">
        <SectionHeading index="01" eyebrow="About" title={about.title} />

        <div className="mt-20 grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Reveal>
              <p className="max-w-2xl font-display text-2xl font-normal leading-snug tracking-tight text-ink sm:text-3xl">
                {about.lead}
              </p>
            </Reveal>

            {/* Timeline-style story: one short line per step */}
            <ol className="mt-12 max-w-2xl">
              {about.story.map((s, i) => (
                <Reveal key={s.year} delay={0.05 + i * 0.06}>
                  <li className="grid grid-cols-[7rem_1fr] gap-4 border-t border-line py-4 sm:grid-cols-[9rem_1fr]">
                    <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{s.year}</span>
                    <p className="text-base leading-relaxed text-ink/85">{s.text}</p>
                  </li>
                </Reveal>
              ))}
            </ol>

            <Reveal delay={0.3}>
              <p className="mt-10 serif text-2xl text-ink sm:text-3xl">{about.closing}</p>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="lg:col-span-3 lg:col-start-10">
            <dl>
              {about.facts.map((f) => (
                <div key={f.k} className="rule flex items-baseline justify-between gap-6 py-3.5 first:border-0 first:pt-0">
                  <dt className="eyebrow">{f.k}</dt>
                  <dd className="text-right text-sm text-ink">{f.v}</dd>
                </div>
              ))}
            </dl>
            <p className="eyebrow mt-10">Currently</p>
            <ul className="mt-3 space-y-2">
              {about.currently.map((c) => (
                <li key={c.label} className="text-sm text-ink">
                  {c.label} <span className="text-muted">— {c.at}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="mt-24 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {about.principles.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.07} className="rule pt-5">
              <span className="font-mono text-xs text-dim">0{i + 1}</span>
              <h3 className="mt-4 font-display text-xl font-medium text-ink">{p.title}</h3>
              <p className="mt-2 text-sm text-muted">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mt-16 rule py-8 sm:mt-28">
        <Marquee items={about.marquee} />
      </div>
    </section>
  );
}
