import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getGallery } from "@/lib/gallery";
import { site } from "@/lib/data";
import { GalleryWall } from "@/components/gallery/GalleryWall";
import { TextReveal } from "@/components/ui/TextReveal";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos and clips from builds, flights, events and the people behind them.",
};

async function Wall() {
  const items = await getGallery();
  if (items.length === 0) {
    return (
      <p className="rule max-w-md pt-6 text-sm text-muted">
        Nothing published yet. Check back soon.
      </p>
    );
  }
  return <GalleryWall items={items} />;
}

export default function GalleryPage() {
  return (
    <section className="container-x pb-24 pt-32 sm:pt-36">
      <div className="rule grid gap-8 pt-6 lg:grid-cols-12">
        <Reveal className="flex items-baseline gap-4 lg:col-span-3">
          <span className="font-mono text-xs text-ink">07</span>
          <span className="eyebrow">Gallery</span>
        </Reveal>
        <div className="lg:col-span-9">
          <TextReveal
            as="h1"
            text="Frames from *the field.*"
            className="font-display text-[clamp(2.6rem,6vw,5.6rem)] font-medium leading-[0.98] text-ink"
          />
          <Reveal delay={0.2} className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <p className="max-w-md text-base leading-relaxed text-muted">
              Builds, flights, classrooms and the odd stage. Open any frame to see it full size.
            </p>
            <Link href="/" className="link-draw inline-flex items-center gap-1.5 text-sm text-ink">
              <ArrowLeft className="size-4" strokeWidth={1.5} />
              Back home
            </Link>
          </Reveal>
        </div>
      </div>

      <div className="mt-16 sm:mt-24">
        <Suspense fallback={<WallSkeleton />}>
          <Wall />
        </Suspense>
      </div>

      <div className="mt-28 flex flex-col items-start gap-4 rule pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-sm text-muted">Want a frame of your project in here? Let&apos;s build something worth photographing.</p>
        <Link href="/#contact" className="group inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-accent">
          Talk to {site.firstName}
          <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.75} />
        </Link>
      </div>
    </section>
  );
}

/** Same silhouette as the wall, so the page doesn't jump when the images arrive. */
function WallSkeleton() {
  const shapes = ["aspect-[4/5]", "aspect-[3/2]", "aspect-square", "aspect-[4/5]", "aspect-[3/2]", "aspect-[5/4]"];
  return (
    <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 lg:gap-8" aria-hidden>
      {shapes.map((s, i) => (
        <div key={i} className={`${s} animate-pulse rounded-sm bg-surface ${i % 3 === 1 ? "mt-16" : ""}`} />
      ))}
    </div>
  );
}
