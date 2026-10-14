# Monu Raj — Portfolio

Dark, premium, fully animated personal portfolio with a real-time WebGL hero.
Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Three.js via
React Three Fiber, Motion, and Lenis smooth scrolling.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint
```

## Where things live

| Path | What it is |
| --- | --- |
| `src/lib/data.ts` | **All copy and links.** Edit this to change any text on the site. |
| `src/app/layout.tsx` | Fonts, metadata, JSON-LD, global shell (navbar, cursor, canvas, footer). |
| `src/app/page.tsx` | Section order. |
| `src/app/globals.css` | Design tokens (`@theme`), utilities, keyframes. |
| `src/components/three/` | WebGL scene: distorted metallic core, gyroscopic rings, scroll-parallax particles. |
| `src/components/sections/` | Hero, About, Experience, Projects, Skills, BeyondTech, Contact. |
| `src/components/ui/` | Preloader, custom cursor, navbar, magnetic buttons, tilt cards, text reveal, marquee. |
| `src/lib/stores.ts` | Scroll/pointer values read by the render loop without React re-renders. |

## Before you deploy

1. **Set the public URL.** Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL`
   (used by metadata, Open Graph, sitemap and robots).
2. **Verify your GitHub link** in `src/lib/data.ts` (`site.links.github`).
3. **Add your résumé** as `public/Monu-Raj-Resume.pdf`, or change `site.links.resume`.
4. Optional: replace the procedural project art in `ProjectArt.tsx` with real screenshots once
   you have permission to publish them.

## Design system

- Background `#090B10` · Surface `#141923` · Accent `#8EA4FF` · Text `#F4F6FA`
- Space Grotesk (display) · Inter (body) · JetBrains Mono (technical)

## Accessibility & performance

- Respects `prefers-reduced-motion` (no preloader, static scene, no custom cursor).
- Custom cursor only on fine pointers; native cursor on touch devices.
- Skip link, focus rings, semantic landmarks, scroll-spy navigation.
- WebGL scene loads client-side only, adapts DPR under load, and lowers particle
  count on phones.
