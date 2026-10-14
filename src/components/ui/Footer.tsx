"use client";

import { useLenis } from "lenis/react";
import { nav, site, builtWith } from "@/lib/data";
import { useLocalTime } from "@/lib/hooks";
import { TextReveal } from "./TextReveal";

export function Footer() {
  const lenis = useLenis();
  const time = useLocalTime(site.timezone);
  // Static on purpose: Cache Components prerender this, and `new Date()` would be frozen anyway.
  const year = 2026;

  const socials = [
    { label: "LinkedIn", href: site.links.linkedin },
    { label: "GitHub", href: site.links.github },
    { label: "CodeMasti", href: site.links.codemasti },
    { label: "Email", href: `mailto:${site.email}` },
  ];

  return (
    <footer className="relative z-10 overflow-hidden rule bg-bg">
      <div className="container-x">
        <div className="pt-16 sm:pt-20">
          <TextReveal
            as="div"
            text="Monu Raj"
            stagger={0.08}
            className="block font-display text-[clamp(4.5rem,19vw,19rem)] font-medium leading-[0.82] tracking-[-0.06em] text-ink"
          />
        </div>

        <div className="mt-14 grid gap-10 rule pt-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="eyebrow">Get in touch</p>
            <a
              href={`mailto:${site.email}`}
              className="link-draw mt-4 inline-block font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl"
            >
              {site.email}
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Open to AI software and robotics roles, and interesting collaborations.
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="eyebrow">Index</p>
            <ul className="mt-4 space-y-4 sm:space-y-2">
              {nav.map((n, i) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    className="group inline-flex items-baseline gap-3 text-sm text-muted transition-colors hover:text-ink"
                  >
                    <span className="font-mono text-[10px] text-dim">0{i}</span>
                    <span className="link-draw">{n.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow">Elsewhere</p>
            <ul className="mt-4 space-y-4 sm:space-y-2">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target={s.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer noopener"
                    className="link-draw text-sm text-muted transition-colors hover:text-ink"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow">Local time</p>
            <p className="mt-4 font-mono text-sm tabular-nums text-ink">{time || "--:--:--"} IST</p>
            <p className="mt-1 text-sm text-muted">{site.location}</p>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 rule py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-dim sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name} · Designed &amp; engineered in-house
          </p>
          <p className="hidden lg:block">{builtWith.join(" / ")}</p>
          <button
            type="button"
            onClick={() => (lenis ? lenis.scrollTo(0, { duration: 1.6 }) : window.scrollTo({ top: 0 }))}
            className="link-draw self-start text-ink sm:self-auto"
          >
            Back to top ↑
          </button>
        </div>
      </div>
    </footer>
  );
}
