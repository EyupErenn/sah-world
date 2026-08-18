import { DESIGN_TOKENS, STATION_COLORS } from '@/lib/designTokens';

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

export interface RoadPath {
  id: string;
  width: number;
  points: ReadonlyArray<readonly [number, number]>;
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
    color: DESIGN_TOKENS.color.brand,
    icon: '🧭',
    xpReward: 0,
    description: 'Köyün kalbi. Tüm yollar buradan başlar.',
  },
  {
    id: 1,
    name: 'Günlük',
    label: 'Günlük Seyir Kulübesi',
    panelId: 'gunluk',
    x: -104,
    z: -48,
    color: STATION_COLORS.journal,
    icon: '📓',
    xpReward: 50,
    description: 'Ruh halini, enerjini ve günlük tefekkürlerini kaydet.',
  },
  {
    id: 2,
    name: 'Kuran',
    label: 'Kelâm-ı Kadîm Köşkü',
    panelId: 'kuran',
    x: 72,
    z: -62,
    color: STATION_COLORS.quran,
    icon: '📖',
    xpReward: 60,
    description: 'Kur\'an-ı Kerim ayetleri, tefsir ve çıkarılan dersler.',
  },
  {
    id: 3,
    name: 'Hadis',
    label: 'Hadis-i Şerif Kütüphanesi',
    panelId: 'hadis',
    x: 96,
    z: 46,
    color: STATION_COLORS.hadis,
    icon: '🕌',
    xpReward: 60,
    description: 'Sünnet-i Seniyye ve hayata tatbik edilen hadisler.',
  },
  {
    id: 4,
    name: 'Matris',
    label: 'Zaman & Amel Kristali',
    panelId: 'matris',
    x: -82,
    z: 58,
    color: STATION_COLORS.matrix,
    icon: '📊',
    xpReward: 25,
    description: 'Eisenhower matrisi ile önceliklerini yönet.',
  },
  {
    id: 5,
    name: 'Hatalar',
    label: 'Tefekkür & İbret Makamı',
    panelId: 'hatalar',
    x: -126,
    z: 8,
    color: STATION_COLORS.mistakes,
    icon: '🛡️',
    xpReward: 40,
    description: 'Hatalarından ders çıkar, geleceğini inşa et.',
  },
  {
    id: 6,
    name: 'Şükür',
    label: 'Şükür & Nimet Bahçesi',
    panelId: 'sukur',
    x: 24,
    z: 116,
    color: STATION_COLORS.gratitude,
    icon: '✨',
    xpReward: 35,
    description: 'Bugünün nimetlerini say ve şükret.',
  },
  {
    id: 7,
    name: 'Mescidim',
    label: 'Köy Mescidi (Dijital Cami)',
    panelId: 'mescidim',
    x: 48,
    z: -108,
    color: STATION_COLORS.mosque,
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
    z: -138,
    yOffset: 0,
    color: STATION_COLORS.depot,
    icon: '👑',
    xpReward: 0,
    description: 'Yolculuk boyunca biriktirdiğin tüm nurların toplandığı ebedi hazine.',
  },
];

export const INTERACTION_RADIUS = 11;
export const WORLD_BOUNDS = 150;
export const WORLD_SIZE = 320;

// Roads are shared by terrain colouring, vehicle grip and the minimap. Curved
// polylines create a readable town hierarchy instead of eight radial spokes.
export const ROAD_PATHS: RoadPath[] = [
  {
    id: 'main-spine',
    width: 7,
    points: [[20, 142], [24, 116], [10, 82], [-8, 42], [0, 0], [10, -36], [0, -78], [0, -138]],
  },
  {
    id: 'west-market-road',
    width: 5.2,
    points: [[-2, 4], [-36, 14], [-66, 38], [-82, 58]],
  },
  {
    id: 'reflection-lane',
    width: 4.4,
    points: [[-36, 14], [-76, 4], [-104, 0], [-126, 8]],
  },
  {
    id: 'journal-lane',
    width: 4.6,
    points: [[-66, 38], [-82, 8], [-92, -24], [-104, -48]],
  },
  {
    id: 'east-learning-road',
    width: 5.4,
    points: [[4, 2], [38, 8], [68, 24], [96, 46]],
  },
  {
    id: 'quran-lane',
    width: 4.6,
    points: [[38, 8], [52, -20], [66, -42], [72, -62]],
  },
  {
    id: 'mosque-lane',
    width: 5,
    points: [[10, -36], [36, -58], [46, -84], [48, -108]],
  },
];

// ============================================================
// Procedural Terrain Height Formula
// Returns height Y at any (X, Z) coordinate
// Flat around plaza and paths, elevated north hill for Ahiret Deposu,
// and rolling natural perimeter hills
// ============================================================
function streamCenterZ(x: number) {
  return 74 + Math.sin(x * 0.026) * 10 + Math.sin(x * 0.075) * 2;
}

export function getStreamCenterZ(x: number) {
  return streamCenterZ(x);
}

function gaussianHill(x: number, z: number, cx: number, cz: number, radius: number, height: number) {
  const distanceSq = (x - cx) ** 2 + (z - cz) ** 2;
  return height * Math.exp(-distanceSq / (2 * radius * radius));
}

function terrainUndulation(x: number, z: number) {
  return Math.sin(x * 0.035) * 1.7 + Math.cos(z * 0.03) * 1.35 + Math.sin((x + z) * 0.018) * 1.1;
}

function rawTerrainHeight(x: number, z: number) {
  const rolling = terrainUndulation(x, z);
  const westernRidge = gaussianHill(x, z, -112, -76, 34, 8.5);
  const easternRidge = gaussianHill(x, z, 118, -18, 38, 7.2);
  const gratitudeHills = gaussianHill(x, z, 82, 118, 42, 5.8);
  const depotHill = gaussianHill(x, z, 0, -138, 34, 13.5);
  const westValley = gaussianHill(x, z, -46, 82, 30, -4.2);
  const eastValley = gaussianHill(x, z, 58, 72, 28, -3.2);
  const streamDistance = Math.abs(z - streamCenterZ(x));
  const streamBed = streamDistance < 8 ? -2.1 * (1 - streamDistance / 8) : 0;

  return rolling + westernRidge + easternRidge + gratitudeHills + depotHill + westValley + eastValley + streamBed;
}

export function getTerrainHeight(x: number, z: number): number {
  const distFromCenter = Math.hypot(x, z);
  if (distFromCenter < 17) return 0;

  let height = rawTerrainHeight(x, z);

  // Give every landmark a stable platform while retaining its local elevation.
  for (const location of VILLAGE_LOCATIONS) {
    if (location.id === 0) continue;
    const distance = Math.hypot(x - location.x, z - location.z);
    if (distance < 15) {
      const platformHeight = rawTerrainHeight(location.x, location.z);
      const blend = THREE_SMOOTHSTEP(distance / 15);
      height = platformHeight * (1 - blend) + height * blend;
      break;
    }
  }

  // Roads follow broad contours but remain comfortable to drive on.
  const roadDistance = getRoadDistance(x, z);
  if (roadDistance < 9) {
    const roadBlend = THREE_SMOOTHSTEP(Math.max(0, (roadDistance - 3) / 6));
    const smoothRoadContour = height - terrainUndulation(x, z) * 0.72;
    height = smoothRoadContour * (1 - roadBlend) + height * roadBlend;
  }

  return Math.max(-3.5, height);
}

// Check if a point (x, z) is on paved road / plaza
export function isRoadSurface(x: number, z: number): boolean {
  if (Math.hypot(x, z) < 18) return true;
  return ROAD_PATHS.some(path => path.points.some((point, index) => {
    const next = path.points[index + 1];
    return next ? pointToSegmentDistance(x, z, point[0], point[1], next[0], next[1]) < path.width : false;
  }));
}

export function getRoadDistance(x: number, z: number): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const path of ROAD_PATHS) {
    for (let index = 0; index < path.points.length - 1; index += 1) {
      const start = path.points[index];
      const end = path.points[index + 1];
      nearest = Math.min(nearest, pointToSegmentDistance(x, z, start[0], start[1], end[0], end[1]));
    }
  }
  return nearest;
}

function THREE_SMOOTHSTEP(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
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
