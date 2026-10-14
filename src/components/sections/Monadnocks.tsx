"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { monadnocks, site } from "@/lib/data";
import { Reveal } from "@/components/ui/Reveal";
import { TextReveal } from "@/components/ui/TextReveal";
import { Button } from "@/components/ui/Button";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Editorial feature for Monadnocks: a seated portrait centred on a faint
 * grid, bold sans statement on the left, serif answer on the right.
 */
export function Monadnocks() {
  return (
    <section id="monadnocks" className="relative overflow-hidden">
      {/* Stage */}
      <div className="relative flex min-h-[90svh] flex-col lg:block lg:h-[100svh]">
        {/* Faint grid + square frame behind the head */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {[46, 72].map((y) => (
            <span key={y} className="absolute inset-x-0 h-px bg-line" style={{ top: `${y}%` }} />
          ))}
          {[13, 29, 71, 87].map((x) => (
            <span key={x} className="absolute inset-y-0 w-px bg-line" style={{ left: `${x}%` }} />
          ))}
          <motion.span
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
            className="absolute hidden border border-line-strong lg:block"
            style={{ left: "27%", top: "7%", width: "46%", height: "40%" }}
          />
        </div>

        {/* Left: handle + bold statement */}
        <div className="relative z-10 order-1 px-5 pt-24 sm:px-10 lg:absolute lg:left-[7%] lg:top-[22%] lg:w-[24%] lg:px-0 lg:pt-0">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-bg/80 py-1 pl-1 pr-3 text-[11px] text-ink">
              <span className="relative size-5 overflow-hidden rounded-full bg-surface">
                <Image src={monadnocks.avatar} alt="" fill sizes="20px" className="object-cover object-top grayscale" />
              </span>
              {monadnocks.handle}
            </span>
          </Reveal>
          <TextReveal
            as="p"
            text={monadnocks.left}
            stagger={0.06}
            className="mt-5 max-w-[11ch] font-display text-[2rem] font-bold leading-[0.95] tracking-[-0.03em] text-ink sm:text-[2.4rem]"
          />
        </div>

        {/* Right: serif answer */}
        <div className="relative z-10 order-3 px-5 pb-16 sm:px-10 lg:absolute lg:right-[7%] lg:top-[20%] lg:w-[26%] lg:px-0 lg:pb-0">
          <TextReveal
            as="p"
            text={monadnocks.right}
            stagger={0.08}
            className="max-w-[8ch] font-serif text-[3.2rem] font-normal leading-[0.9] tracking-[-0.02em] text-ink sm:text-[4rem] lg:text-[clamp(3.5rem,5.6vw,6rem)]"
          />
        </div>

        {/* Portrait, cropped by the stage's bottom edge */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 1.3, ease: EASE }}
          className="relative order-2 mx-auto mt-8 aspect-[1198/1312] w-[86%] max-w-[26rem] lg:absolute lg:bottom-0 lg:left-1/2 lg:top-[11%] lg:mt-0 lg:aspect-auto lg:h-auto lg:w-auto lg:max-w-none lg:-translate-x-1/2"
        >
          <div className="relative mx-auto h-full w-full lg:aspect-[1198/1312] lg:max-w-[44vw]">
            <Image
              src={monadnocks.portrait}
              alt={`${site.name}, founder of Monadnocks`}
              fill
              sizes="(min-width: 1024px) 40vw, 86vw"
              className="object-cover object-top"
            />
          </div>
        </motion.div>
      </div>

      {/* Studio details */}
      <div className="container-x">
        <Reveal className="grid gap-10 rule py-12 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-4">
            <p className="eyebrow">Founder · Web studio</p>
            <h3 className="mt-3 font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">{monadnocks.name}</h3>
          </div>
          <div className="lg:col-span-4">
            <p className="text-base leading-relaxed text-muted">{monadnocks.body}</p>
            <p className="mt-5 font-mono text-[11px] uppercase leading-loose tracking-[0.14em] text-dim">
              {monadnocks.services.join(" · ")}
            </p>
          </div>
          <div className="flex flex-col items-start gap-6 lg:col-span-4 lg:items-end">
            <div className="lg:text-right">
              <p className="font-display text-4xl font-light leading-none tracking-tight text-ink sm:text-5xl">{monadnocks.stat.value}</p>
              <p className="mt-2 text-sm text-muted">{monadnocks.stat.label}</p>
            </div>
            <Button href={monadnocks.cta.href} variant="ghost" target="_blank" rel="noreferrer noopener">
              {monadnocks.cta.label}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
