"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowDown } from "lucide-react";
import { hero, site } from "@/lib/data";
import { anchorStore } from "@/lib/stores";
import { useApp } from "@/components/providers/AppProviders";
import { TextReveal } from "@/components/ui/TextReveal";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const { ready } = useApp();
  const headline = useRef<HTMLDivElement>(null);
  const show = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 },
    transition: { duration: 1, ease: EASE, delay },
  });

  // Publish where the last letter of the first word ("u" of "Monu") sits, so the
  // drone can park just above it. Measured against the word's static mask so the
  // reveal animation (which transforms the inner span) doesn't skew the result.
  useEffect(() => {
    const root = headline.current;
    if (!root) return;
    const measure = () => {
      const mask = root.querySelector<HTMLElement>(".word-mask");
      const inner = mask?.firstElementChild as HTMLElement | null;
      const textNode = inner?.firstChild;
      if (!mask || !inner || !textNode || textNode.nodeType !== Node.TEXT_NODE) {
        // Reduced motion renders plain spans: fall back to the first word's box.
        const word = root.querySelector<HTMLElement>("span");
        if (!word) return;
        const r = word.getBoundingClientRect();
        if (r.width === 0) return;
        const letter = r.width / Math.max(1, (word.textContent ?? "").length);
        anchorStore.x = r.right - letter * 0.5;
        anchorStore.top = r.top + window.scrollY + r.height * 0.38;
        anchorStore.width = letter;
        anchorStore.ready = true;
        return;
      }
      const len = textNode.textContent?.length ?? 0;
      if (len === 0) return;
      const range = document.createRange();
      range.setStart(textNode, len - 1);
      range.setEnd(textNode, len);
      const glyph = range.getBoundingClientRect();
      const innerRect = inner.getBoundingClientRect();
      const maskRect = mask.getBoundingClientRect();
      if (glyph.width === 0 || maskRect.width === 0) return;
      // Glyph offset within the (possibly transformed) inner span, re-based onto the static mask.
      anchorStore.x = maskRect.left + (glyph.left - innerRect.left) + glyph.width / 2;
      // A lowercase "u" is x-height: its top sits well below the line box's top.
      anchorStore.top = maskRect.top + window.scrollY + maskRect.height * 0.38;
      anchorStore.width = glyph.width;
      anchorStore.ready = true;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(document.documentElement);
    window.addEventListener("resize", measure);
    const timers = [400, 1200, 2400].map((ms) => window.setTimeout(measure, ms));
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      timers.forEach((t) => window.clearTimeout(t));
      anchorStore.ready = false;
    };
  }, [ready]);

  return (
    <section id="home" className="relative flex min-h-[100svh] flex-col overflow-hidden lg:block">
      {/* Ghost: a giant, faded gradient "Monu" across the whole stage */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 2, ease: "easeOut", delay: 0.6 }}
        className="pointer-events-none absolute inset-x-0 top-[22vh] z-0 select-none overflow-hidden lg:top-[9vh]"
      >
        <span className="block whitespace-nowrap pl-[2vw] font-didone text-[clamp(14rem,42vw,44rem)] font-black leading-[0.8] tracking-[-0.04em] text-transparent [-webkit-background-clip:text] [background-clip:text] [background-image:linear-gradient(90deg,rgba(18,18,18,0.07),rgba(18,18,18,0.035)_55%,rgba(18,18,18,0)_100%)]">
          {hero.ghost}
        </span>
      </motion.div>

      {/* Vertical rail: role at top, hairline, year at bottom */}
      <motion.div
        {...show(0.4)}
        aria-hidden
        className="absolute bottom-[7vh] left-[5.5vw] top-[9vh] hidden w-4 flex-col items-center lg:flex"
      >
        <span className="writing-vertical text-[13px] text-muted">{hero.rail.role}</span>
        <span className="my-5 w-px flex-1 bg-line-strong" />
        <span className="writing-vertical text-[13px] text-muted">{hero.rail.year}</span>
      </motion.div>

      {/* Portrait: anchored to the right edge, head near the top, cropped at the fold */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 1.4, ease: EASE, delay: 0.5 }}
        className="relative order-last mx-5 mt-10 aspect-[5/6] sm:mx-10 lg:absolute lg:bottom-0 lg:right-0 lg:top-[4vh] lg:mx-0 lg:mt-0 lg:aspect-auto lg:w-[54%]"
      >
        <Image
          src={site.portrait}
          alt={`${site.name}, portrait`}
          fill
          priority
          sizes="(min-width: 1024px) 54vw, 100vw"
          className="object-cover object-top grayscale"
        />
      </motion.div>

      {/* Copy column */}
      <div className="relative z-10 flex flex-col px-5 pb-6 pt-32 sm:px-10 lg:min-h-[100svh] lg:w-[50%] lg:pb-[6vh] lg:pl-[12vw] lg:pt-[13vh]">
        <motion.dl {...show(0.3)} className="flex gap-9">
          {hero.stats.map((s) => (
            <div key={s.label}>
              <dd className="font-display text-[2.1rem] font-light leading-none tracking-tight text-ink sm:text-[2.4rem]">
                <sup className="mr-0.5 align-super text-[1.1rem] text-ink">+</sup>
                {s.value}
              </dd>
              <dt className="mt-1.5 text-[12px] text-muted">{s.label}</dt>
            </div>
          ))}
        </motion.dl>

        <div className="my-auto py-14 lg:py-0">
          <motion.p {...show(0.6)} className="font-display text-[13px] font-semibold tracking-[0.04em] text-ink">
            01
          </motion.p>
          <div ref={headline}>
            <TextReveal
              as="h1"
              text={hero.headline}
              trigger="ready"
              delay={0.75}
              stagger={0.1}
              className="mt-2 whitespace-nowrap font-didone text-[clamp(3rem,min(7vw,12vh),6.6rem)] font-black leading-[0.95] tracking-[-0.02em] text-ink"
            />
          </div>
          <TextReveal
            as="p"
            text={hero.subline}
            trigger="ready"
            delay={1.3}
            stagger={0.02}
            className="mt-4 text-[14px] text-muted sm:text-[15px]"
          />
        </div>

        <motion.a
          {...show(1.1)}
          href="#about"
          className="-my-2.5 inline-flex items-center gap-1.5 self-start py-2.5 text-[15px] text-ink"
        >
          Scroll down
          <ArrowDown className="size-4" strokeWidth={1.5} />
        </motion.a>
      </div>
    </section>
  );
}
