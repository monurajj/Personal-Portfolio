import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-x flex min-h-[100svh] flex-col items-start justify-center py-32">
      <p className="font-mono text-xs text-accent">(404)</p>
      <h1 className="mt-6 font-display text-[clamp(2.5rem,7vw,6rem)] font-medium leading-[0.98] tracking-tight">
        This page drifted <em>out of orbit.</em>
      </h1>
      <p className="mt-6 max-w-md text-muted">The page you asked for doesn&apos;t exist. Let&apos;s get you back.</p>
      <Link
        href="/"
        className="mt-10 inline-flex rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-bg transition-colors hover:bg-accent"
      >
        Back home
      </Link>
    </section>
  );
}
