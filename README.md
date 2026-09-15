This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Yaşayan Gelişim Alanı (botanical-v1)

`src/components/core/GrowthScene.tsx` is the SVG botanical dashboard. `GrowthTree`
adapts the existing XP store and integrated activity feed; no new database fields
or packages are introduced.

### Data contract

`GrowthSceneData` contains `stage` (continuous 0–10), `level` (1–10), `xh`,
`xhToNext`, `weeklyActions`, `fedAreas`, `vitalityScore` (0–100), and seven
`habitats`. Each habitat has `id`, `name`, `icon`, `count7d`, `daily` (seven
numbers, oldest day first), `status`, `target`, `description`, and `intensity`.
The typed contract and pure adapter live in `src/lib/growthScene.ts`.

Daily buckets include today and the preceding six local calendar days, exclude
future timestamps, and refresh every minute and on tab visibility. Quran and
hadith feed the Quran habitat; the other six use their corresponding categories.
Existing level thresholds drive stage interpolation; activity never invents XP.

Vitality is rounded and capped at 100: `40 * fedAreas/7 + 35 * activeDays/7 +
25 * min(weeklyActions,21)/21`. States: 0 **dormant**, 1–24 **sprouting**,
25–74 **flourishing**, 75–100 **radiant**. This is only a visual score.

### Layers and motion

`growth/BotanicalScene.tsx` has eight SVG layers: time-tinted sky, four blurred
clouds, top-right sun/rays, three atmospheric hills, meadow/contact shadow,
curved trunk/branches/six foliage clusters, foreground grass/pollen, and
soil/roots. Stage interpolates tree/canopy scale and root spread. Fed areas
determine root-tip brightness. All palettes are CSS variables in
`growth/GrowthScene.module.css`, including dark and dawn/day/dusk variants.

Desktop (≥1280px) uses an orbit; tablet uses a snap-scrolling rail; mobile
(≤620px) uses stacked buttons. Each button has keyboard focus and navigation.
The SVG has a Turkish state summary without hiding buttons from screen readers.
New recent event IDs trigger a 1.5-second pulse; initial hydration and duplicate
refetches do not. Empty weeks offer “İlk hareketini yap”. Loading retains geometry.

IntersectionObserver and tab visibility pause motion. Reduced-motion disables
CSS motion and springs. Repeated leaf geometry uses SVG `use`; no 3D/canvas or
image payload is loaded. Maximum botanical particles: 22 (12 motes, 4 root
drops, 6 burst lights). Idle motion uses transforms/opacity; small connection
strokes animate dash offsets. Existing Framer Motion handles only the spring.

Run `node --test tests/growth-scene.cjs` for calendar buckets, data binding,
level interpolation and vitality boundaries; run `npm run build` for production.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
