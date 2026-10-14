"use client";

import Image from "next/image";
import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useLenis } from "lenis/react";
import { ArrowUpRight } from "lucide-react";
import { nav, site } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProviders";

const EASE = [0.76, 0, 0.24, 1] as const;

function Mark() {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={120}
      height={80}
      priority
      className="h-7 w-auto select-none"
    />
  );
}

/** A tiny top-down quadcopter with live rotors — the icon on the Fly button. */
function Prop({ className }: { className?: string }) {
  const rotors: Array<[number, number, 1 | -1]> = [
    [6.5, 6.5, 1],
    [17.5, 6.5, -1],
    [6.5, 17.5, -1],
    [17.5, 17.5, 1],
  ];
  return (
    <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* arms */}
      <path d="M9.6 9.6 L6.5 6.5 M14.4 9.6 L17.5 6.5 M9.6 14.4 L6.5 17.5 M14.4 14.4 L17.5 17.5" strokeWidth="1.6" />
      {/* body */}
      <rect x="9.2" y="9.6" width="5.6" height="4.8" rx="1.4" fill="currentColor" stroke="none" />
      {/* camera */}
      <circle cx="12" cy="14.9" r="0.9" fill="currentColor" stroke="none" />
      {/* rotor guards + spinning blades */}
      {rotors.map(([cx, cy, dir], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="4" strokeWidth="1.1" opacity="0.55" />
          <g
            className="animate-spin"
            style={{ transformOrigin: `${cx}px ${cy}px`, animationDuration: "0.5s", animationDirection: dir === 1 ? "normal" : "reverse" }}
          >
            <path d={`M${cx - 3.2} ${cy} H${cx + 3.2}`} strokeWidth="1.3" />
          </g>
          <circle cx={cx} cy={cy} r="0.8" fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  );
}

/** The simulator link: a pill with a live propeller, highlighted while on /fly. */
function FlyLink({ active, className, onClick }: { active: boolean; className?: string; onClick?: () => void }) {
  return (
    <Link
      href="/fly"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-300",
        active ? "border-ink bg-ink text-bg" : "border-line-strong text-ink hover:border-ink",
        className,
      )}
    >
      <Prop className="size-4" />
      <span>Fly this drone</span>
    </Link>
  );
}

export function Navbar() {
  const lenis = useLenis();
  const { ready } = useApp();
  const pathname = usePathname();
  const home = pathname === "/";
  const onFly = pathname === "/fly";
  const onGallery = pathname === "/gallery";
  const onAdmin = pathname.startsWith("/admin");
  const [spied, setSpied] = useState("home");
  // Only the home page has sections to highlight.
  const active = home ? spied : "";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 40));

  // Section links scroll in place on the home page and navigate back to it elsewhere.
  const hrefFor = (hash: string) => (home ? hash : `/${hash}`);

  // Scroll-spy: the active section is the last one whose top has passed a line
  // a third of the way down the viewport. Robust to tall sections and sub-sections
  // (e.g. Monadnocks counts as part of Projects).
  useEffect(() => {
    if (!home) return;
    const ids = nav.map((n) => n.href.slice(1));
    const pick = () => {
      const line = window.innerHeight * 0.33;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      // Bottom of page: always Contact.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = "contact";
      setSpied((prev) => (prev === current ? prev : current));
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, [home]);

  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
  }, [open, lenis]);

  const go = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    setOpen(false);
    // Off the home page the link is a real navigation to "/#section"; let it through.
    if (!home) return;
    e.preventDefault();
    const el = document.querySelector<HTMLElement>(href);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
    else el.scrollIntoView({ behavior: "smooth" });
    history.replaceState(null, "", href);
  };

  const links = nav.filter((n) => n.href !== "#home" && n.href !== "#contact");

  if (onAdmin) return null;

  return (
    <>
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className={cn(
          "fixed inset-x-0 top-0 z-[75] transition-[background-color,border-color] duration-500",
          scrolled ? "border-b border-line bg-bg/85 backdrop-blur-md" : "border-b border-transparent",
        )}
      >
        <nav aria-label="Primary" className="container-x flex items-center justify-between py-4 sm:py-5">
          <div className="flex items-center gap-10">
            <Link href={hrefFor("#home")} onClick={(e) => go(e, "#home")} aria-label={`${site.name} — home`} className="text-ink">
              <Mark />
            </Link>
            <ul className="hidden items-center gap-1 md:flex">
              {links.map((item) => {
                const isActive = active === item.href.slice(1);
                return (
                  <li key={item.href} className="relative">
                    <Link
                      href={hrefFor(item.href)}
                      onClick={(e) => go(e, item.href)}
                      aria-current={isActive ? "location" : undefined}
                      className={cn(
                        "relative z-10 block rounded-full px-3.5 py-1.5 text-sm transition-colors duration-300",
                        isActive ? "text-bg" : "text-muted hover:text-ink",
                      )}
                    >
                      {item.label}
                    </Link>
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-ink"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    )}
                  </li>
                );
              })}
              <li className="relative">
                <Link
                  href="/gallery"
                  onClick={() => setOpen(false)}
                  aria-current={onGallery ? "page" : undefined}
                  className={cn(
                    "relative z-10 block rounded-full px-3.5 py-1.5 text-sm transition-colors duration-300",
                    onGallery ? "text-bg" : "text-muted hover:text-ink",
                  )}
                >
                  Gallery
                </Link>
                {onGallery && (
                  <motion.span
                    layoutId="nav-active"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-ink"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {/* Current section, for phones where the link list is hidden */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={active}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted md:hidden"
              >
                {nav.find((n) => n.href.slice(1) === active)?.label ?? ""}
              </motion.span>
            </AnimatePresence>
            <FlyLink active={onFly} className="hidden sm:inline-flex" onClick={() => setOpen(false)} />
            <Link
              href={hrefFor("#contact")}
              onClick={(e) => go(e, "#contact")}
              aria-current={active === "contact" ? "location" : undefined}
              className={cn(
                "group hidden items-center gap-1 rounded-full px-3.5 py-1.5 text-sm transition-colors duration-300 md:inline-flex",
                active === "contact" ? "bg-ink text-bg" : "text-ink underline decoration-ink/40 underline-offset-[5px] hover:decoration-ink",
              )}
            >
              Let&apos;s talk
              <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.5} />
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="text-sm text-ink underline underline-offset-[5px] md:hidden"
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[72] flex flex-col justify-between bg-bg px-5 pb-10 pt-28 md:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <ul>
              {nav.map((item, i) => (
                <motion.li
                  key={item.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.5, ease: EASE }}
                  className="rule"
                >
                  <Link
                    href={hrefFor(item.href)}
                    onClick={(e) => go(e, item.href)}
                    aria-current={active === item.href.slice(1) ? "location" : undefined}
                    className={cn(
                      "flex items-baseline justify-between py-4 font-display text-3xl font-medium tracking-tight",
                      active === item.href.slice(1) ? "text-ink" : "text-muted",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      {active === item.href.slice(1) && <span className="size-2 rounded-full bg-ink" />}
                      {item.label}
                    </span>
                    <span className="font-mono text-xs text-dim">0{i}</span>
                  </Link>
                </motion.li>
              ))}
              <motion.li
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.15 + nav.length * 0.05, duration: 0.5, ease: EASE }}
                className="rule"
              >
                <Link
                  href="/gallery"
                  onClick={() => setOpen(false)}
                  aria-current={onGallery ? "page" : undefined}
                  className={cn(
                    "flex items-baseline justify-between py-4 font-display text-3xl font-medium tracking-tight",
                    onGallery ? "text-ink" : "text-muted",
                  )}
                >
                  <span className="flex items-center gap-3">
                    {onGallery && <span className="size-2 rounded-full bg-ink" />}
                    Gallery
                  </span>
                  <span className="font-mono text-xs text-dim">0{nav.length}</span>
                </Link>
              </motion.li>
            </ul>
            <div className="flex flex-col gap-5">
              <FlyLink active={onFly} className="self-start" onClick={() => setOpen(false)} />
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{site.email}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
