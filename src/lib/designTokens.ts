/**
 * SAH World visual language.
 *
 * CSS-facing values are mirrored in app/globals.css. Three.js cannot consume
 * CSS custom properties reliably, so all world materials and lights import
 * this typed palette instead of inventing local colors.
 */
export const DESIGN_TOKENS = {
  color: {
    brand: '#4f46e5',
    brandViolet: '#7c3aed',
    brandSoft: '#818cf8',
    brandSubtle: '#eef2ff',
    accent: '#0f766e',
    cyan: '#0284c7',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#e11d48',
    info: '#2563eb',
    ink: '#172033',
    inkSecondary: '#465168',
    muted: '#6f7c94',
    canvas: '#f6f7fb',
    surface: '#ffffff',
    surfaceRaised: '#fbfbfe',
    border: '#e3e7ef',
  },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 },
  radius: { sm: 8, md: 16, lg: 24 },
  shadow: {
    card: '0 4px 16px rgba(28,39,68,0.07)',
    raised: '0 18px 54px rgba(28,39,68,0.14)',
    glow: '0 12px 36px rgba(79,70,229,0.28)',
  },
  type: {
    display: { size: 48, lineHeight: 1.05, weight: 760 },
    pageTitle: { size: 32, lineHeight: 1.15, weight: 740 },
    sectionTitle: { size: 20, lineHeight: 1.3, weight: 700 },
    cardTitle: { size: 16, lineHeight: 1.4, weight: 680 },
    body: { size: 15, lineHeight: 1.65, weight: 450 },
    small: { size: 13, lineHeight: 1.55, weight: 450 },
    label: { size: 12, lineHeight: 1.4, weight: 650 },
    caption: { size: 11, lineHeight: 1.45, weight: 500 },
  },
} as const;

export const WORLD_COLORS = {
  skyZenith: '#c7d2fe',
  skyHorizon: '#818cf8',
  fog: '#7c83b8',
  sun: '#fff1d6',
  coolFill: '#b7d8ff',
  earthFill: '#173c35',
  grassLow: '#185c45',
  grassHigh: '#3f8a5f',
  road: '#34364f',
  plaza: '#454663',
  hill: '#40366d',
  soil: '#6b4733',
  water: '#3188c7',
  rock: '#676b82',
  foliage: '#287354',
  foliageLight: '#41966a',
  trunk: '#68402a',
  shadow: '#111325',
  lantern: '#f6b94a',
} as const;

export const STATION_COLORS = {
  journal: DESIGN_TOKENS.color.brand,
  quran: DESIGN_TOKENS.color.warning,
  hadis: DESIGN_TOKENS.color.success,
  matrix: DESIGN_TOKENS.color.cyan,
  mistakes: DESIGN_TOKENS.color.danger,
  gratitude: '#e0a12b',
  mosque: '#059669',
  depot: '#eab308',
} as const;
