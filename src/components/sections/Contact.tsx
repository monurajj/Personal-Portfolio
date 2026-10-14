"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check } from "lucide-react";
import { contact, site } from "@/lib/data";
import { TextReveal } from "@/components/ui/TextReveal";
import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "./ContactForm";

export function Contact() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${site.email}`;
    }
  };

  const links = [
    { label: "LinkedIn", href: site.links.linkedin },
    { label: "GitHub", href: site.links.github },
    { label: "CodeMasti", href: site.links.codemasti },
  ];

  return (
    <section id="contact" className="relative py-28 sm:py-40">
      <div className="container-x">
        <Reveal className="rule flex items-baseline gap-4 pt-6">
          <span className="font-mono text-xs text-ink">06</span>
          <span className="eyebrow">Contact</span>
        </Reveal>

        <TextReveal
          as="h2"
          text={contact.title}
          stagger={0.07}
          className="mt-10 max-w-[11ch] font-display text-[clamp(3rem,9vw,9.5rem)] font-medium leading-[0.92] text-ink"
        />

        <div className="mt-20 grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="max-w-md text-lg leading-relaxed text-muted">{contact.body}</p>
            </Reveal>
            <Reveal delay={0.1} className="mt-10">
              <p className="eyebrow">Email</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                <a
                  href={`mailto:${site.email}`}
                  className="link-draw font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl"
                >
                  {site.email}
                </a>
                <button
                  type="button"
                  onClick={copy}
                  aria-live="polite"
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={copied ? "ok" : "copy"}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="inline-flex items-center gap-1.5"
                    >
                      {copied ? (
                        <>
                          <Check className="size-3" /> Copied
                        </>
                      ) : (
                        "Copy"
                      )}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </div>
            </Reveal>
            <Reveal delay={0.15} className="mt-10">
              <p className="eyebrow">Elsewhere</p>
              <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
                {links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="link-draw inline-flex items-center gap-1 text-base text-ink"
                    >
                      {l.label} <ArrowUpRight className="size-3.5 text-muted" />
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="lg:col-span-6 lg:col-start-7">
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
