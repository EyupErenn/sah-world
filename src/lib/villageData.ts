// ============================================================
// SAH WORLD — Village World Layout, Terrain & Road Network
// ============================================================

export interface VillageLocation {
  id: number;
  name: string;
  label: string;
  panelId: string;
  x: number;
  z: number;
  yOffset?: number;
  color: string;
  icon: string;
  xpReward: number;
  description: string;
}

// 8 Distinct Village Locations + Central Plaza
export const VILLAGE_LOCATIONS: VillageLocation[] = [
  {
    id: 0,
    name: 'Köy Meydanı',
    label: 'Merkez Meydan & Pusula',
    panelId: 'hero',
    x: 0,
    z: 0,
    color: '#6366f1',
    icon: '🧭',
    xpReward: 0,
    description: 'Köyün kalbi. Tüm yollar buradan başlar.',
  },
  {
    id: 1,
    name: 'Günlük',
    label: 'Günlük Seyir Kulübesi',
    panelId: 'gunluk',
    x: -32,
    z: -26,
    color: '#6366f1',
    icon: '📓',
    xpReward: 50,
    description: 'Ruh halini, enerjini ve günlük tefekkürlerini kaydet.',
  },
  {
    id: 2,
    name: 'Kuran',
    label: 'Kelâm-ı Kadîm Köşkü',
    panelId: 'kuran',
    x: 38,
    z: -22,
    color: '#f59e0b',
    icon: '📖',
    xpReward: 60,
    description: 'Kur\'an-ı Kerim ayetleri, tefsir ve çıkarılan dersler.',
  },
  {
    id: 3,
    name: 'Hadis',
    label: 'Hadis-i Şerif Kütüphanesi',
    panelId: 'hadis',
    x: 34,
    z: 32,
    color: '#10b981',
    icon: '🕌',
    xpReward: 60,
    description: 'Sünnet-i Seniyye ve hayata tatbik edilen hadisler.',
  },
  {
    id: 4,
    name: 'Matris',
    label: 'Zaman & Amel Kristali',
    panelId: 'matris',
    x: -36,
    z: 28,
    color: '#06b6d4',
    icon: '📊',
    xpReward: 25,
    description: 'Eisenhower matrisi ile önceliklerini yönet.',
  },
  {
    id: 5,
    name: 'Hatalar',
    label: 'Tefekkür & İbret Makamı',
    panelId: 'hatalar',
    x: -46,
    z: 0,
    color: '#f43f5e',
    icon: '🛡️',
    xpReward: 40,
    description: 'Hatalarından ders çıkar, geleceğini inşa et.',
  },
  {
    id: 6,
    name: 'Şükür',
    label: 'Şükür & Nimet Bahçesi',
    panelId: 'sukur',
    x: 0,
    z: 48,
    color: '#10b981',
    icon: '✨',
    xpReward: 35,
    description: 'Bugünün nimetlerini say ve şükret.',
  },
  {
    id: 7,
    name: 'Mescidim',
    label: 'Köy Mescidi (Dijital Cami)',
    panelId: 'mescidim',
    x: 24,
    z: -48,
    color: '#059669',
    icon: '📿',
    xpReward: 30,
    description: 'Tespih çek, günün ayet ve hadisiyle feyizlen.',
  },
  {
    id: 8,
    name: 'Ahiret Deposu',
    label: 'Ahiret Deposu & Sarayı',
    panelId: 'depot',
    x: 0,
    z: -62,
    yOffset: 3.5,
    color: '#eab308',
    icon: '👑',
    xpReward: 0,
    description: 'Yolculuk boyunca biriktirdiğin tüm nurların toplandığı ebedi hazine.',
  },
];

export const INTERACTION_RADIUS = 9.0;
export const WORLD_BOUNDS = 75;

// ============================================================
// Procedural Terrain Height Formula
// Returns height Y at any (X, Z) coordinate
// Flat around plaza and paths, elevated north hill for Ahiret Deposu,
// and rolling natural perimeter hills
// ============================================================
export function getTerrainHeight(x: number, z: number): number {
  const distFromCenter = Math.sqrt(x * x + z * z);

  // 1. Center Plaza is completely flat (radius 18)
  if (distFromCenter < 16) {
    return 0;
  }

  // 2. North Hill for Ahiret Deposu (x: [-20, 20], z: [-72, -48])
  const depotDist = Math.sqrt(x * x + (z + 62) * (z + 62));
  if (depotDist < 26) {
    const hillFactor = Math.cos((depotDist / 26) * (Math.PI / 2));
    return hillFactor * hillFactor * 4.2;
  }

  // 3. Lake depression at (-14, 12)
  const lakeDist = Math.sqrt((x + 14) * (x + 14) + (z - 12) * (z - 12));
  if (lakeDist < 12) {
    return -0.8 * Math.cos((lakeDist / 12) * (Math.PI / 2));
  }

  // 4. Flat corridors for the main roads connecting to buildings
  for (const loc of VILLAGE_LOCATIONS) {
    if (loc.id === 0 || loc.id === 8) continue;
    // Distance from building platform
    const bDist = Math.sqrt((x - loc.x) * (x - loc.x) + (z - loc.z) * (z - loc.z));
    if (bDist < 12) {
      return 0.1;
    }
  }

  // 5. Gentle rolling hills in the meadows and outer edges
  const baseWave = (Math.sin(x * 0.06) * 1.2 + Math.cos(z * 0.05) * 1.2);
  const perimeterDist = Math.max(0, distFromCenter - 45);
  const boundaryHill = Math.pow(perimeterDist / 30, 2) * 8.0;

  return Math.max(-0.6, baseWave * 0.5 + boundaryHill);
}

// Check if a point (x, z) is on paved road / plaza
export function isRoadSurface(x: number, z: number): boolean {
  const distFromCenter = Math.sqrt(x * x + z * z);
  if (distFromCenter < 14) return true; // Plaza

  // Check road corridors between plaza (0,0) and each building
  for (const loc of VILLAGE_LOCATIONS) {
    if (loc.id === 0) continue;
    // Distance from segment (0,0) to (loc.x, loc.z)
    const distToRoad = pointToSegmentDistance(x, z, 0, 0, loc.x, loc.z);
    if (distToRoad < 2.6) return true;
  }

  return false;
}

function pointToSegmentDistance(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - x1, pz - z1);

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  return Math.hypot(px - projX, pz - projZ);
}
