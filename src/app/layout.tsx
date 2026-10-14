import type { Metadata, Viewport } from "next";
import { Dancing_Script, Inter, Instrument_Serif, JetBrains_Mono, Playfair_Display, Space_Grotesk } from "next/font/google";
import "./globals.css";

import { site } from "@/lib/data";
import { AppProviders } from "@/components/providers/AppProviders";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { Preloader } from "@/components/ui/Preloader";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { SceneCanvas } from "@/components/three/SceneCanvas";
import { HomeOnly } from "@/components/providers/HomeOnly";
import { Analytics } from "@/components/providers/Analytics";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const script = Dancing_Script({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-dancing-script",
  display: "swap",
});

const didone = Playfair_Display({
  subsets: ["latin"],
  weight: ["800", "900"],
  variable: "--font-playfair",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.role} · Entrepreneur · Robotics`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  keywords: [
    "Monu Raj",
    "Software Engineer",
    "CodeMasti",
    "Drone R&D",
    "Newton School of Technology",
    "Portfolio",
    "React",
    "Next.js",
    "AI",
    "Robotics",
  ],
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  openGraph: {
    type: "website",
    url: site.url,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    siteName: site.name,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#F2F2F0",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  jobTitle: site.role,
  email: `mailto:${site.email}`,
  url: site.url,
  sameAs: [site.links.linkedin, site.links.codemasti],
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Newton School of Technology",
  },
  worksFor: [
    { "@type": "Organization", name: "CodeMasti", url: site.links.codemasti },
    { "@type": "Organization", name: "Utsedha Unmanned Pvt. Ltd." },
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Aurangabad",
    addressRegion: "Bihar",
    addressCountry: "IN",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${grotesk.variable} ${mono.variable} ${serif.variable} ${script.variable} ${didone.variable} h-full antialiased`}
    >
      <body className="noise relative min-h-full flex flex-col bg-bg text-ink font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <AppProviders>
          <Analytics />
          <Preloader />
          <CustomCursor />
          {/* The scroll bar, WebGL backdrop and footer belong to the one-page portfolio only. */}
          <HomeOnly>
            <ScrollProgress />
            <SceneCanvas />
          </HomeOnly>
          <Navbar />
          <main id="main" className="relative z-10 flex-1">
            {children}
          </main>
          <HomeOnly>
            <Footer />
          </HomeOnly>
        </AppProviders>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
