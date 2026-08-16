import type { StationDef, LevelDef, BadgeDef, VehicleDef, VehicleType } from '@/types';

// ============================================================
// VEHICLE DEFINITIONS
// ============================================================
export const VEHICLE_DEFS: Record<VehicleType, VehicleDef> = {
  car: {
    type: 'car',
    name: 'Otomobil',
    icon: '🚗',
    flavorText: 'Dengeli, kararlı ve uzun soluklu bir yolcu.',
    color: '#4f46e5',
  },
  bike: {
    type: 'bike',
    name: 'Bisiklet',
    icon: '🚲',
    flavorText: 'Hafif, enerjik ve kendi emeğiyle ilerleyen.',
    color: '#059669',
  },
  horse: {
    type: 'horse',
    name: 'Atlı',
    icon: '🐎',
    flavorText: 'Sabırlı, istikrarlı ve kadim bir yolcu.',
    color: '#b8860b',
  },
  rocket: {
    type: 'rocket',
    name: 'Roket',
    icon: '🚀',
    flavorText: 'Yüksek ideallere odaklı, azimli ve süratli.',
    color: '#ef4444',
  },
};

// ============================================================
// CURVE CONTROL POINTS (plain numbers — no Three.js import needed server-side)
// The actual CatmullRomCurve3 is built in lib/curve.ts (client-only)
// ============================================================
export const CURVE_POINTS: [number, number, number][] = [
  [0,   0,   0],
  [14,  1.5, 48],
  [-18, 3,   100],
  [20,  2,   155],
  [-12, 4.5, 210],
  [18,  3,   265],
  [-16, 5.5, 320],
  [12,  4,   375],
  [0,   7,   440],
];

// ============================================================
// LIFE STATIONS along the curve (progress = 0.0–1.0)
// ============================================================
export const STATIONS: StationDef[] = [
  { id: 0, name: 'Evren',    label: 'Başlangıç',             progress: 0.00, panelId: 'hero',      color: '#4f46e5', threeColor: 0x4f46e5, icon: 'ti-compass',         xpReward: 0  },
  { id: 1, name: 'Günlük',   label: 'Günlük Seyir Defteri',  progress: 0.12, panelId: 'gunluk',    color: '#4f46e5', threeColor: 0x4f46e5, icon: 'ti-notebook',        xpReward: 50 },
  { id: 2, name: 'Kuran',    label: 'Kuran-ı Kerim Günlüğü', progress: 0.25, panelId: 'kuran',     color: '#b8860b', threeColor: 0xb8860b, icon: 'ti-book',            xpReward: 60 },
  { id: 3, name: 'Hadis',    label: 'Hadis-i Şerif Günlüğü', progress: 0.38, panelId: 'hadis',     color: '#059669', threeColor: 0x059669, icon: 'ti-quote',           xpReward: 60 },
  { id: 4, name: 'Matris',   label: 'Eisenhower Matrisi',    progress: 0.50, panelId: 'matris',    color: '#06b6d4', threeColor: 0x06b6d4, icon: 'ti-layout-grid',     xpReward: 25 },
  { id: 5, name: 'Hatalar',  label: 'Hatalar ve Dersler',    progress: 0.63, panelId: 'hatalar',   color: '#ef4444', threeColor: 0xef4444, icon: 'ti-history',         xpReward: 40 },
  { id: 6, name: 'Şükür',    label: 'Şükür ve Nimet Köşesi', progress: 0.76, panelId: 'sukur',     color: '#10b981', threeColor: 0x10b981, icon: 'ti-sparkles',        xpReward: 35 },
  { id: 7, name: 'Mescidim', label: 'Dijital Mescid',        progress: 0.88, panelId: 'mescidim',  color: '#059669', threeColor: 0x059669, icon: 'ti-building-mosque', xpReward: 30 },
  { id: 8, name: 'Depo',     label: 'Ahiret Deposu',         progress: 1.00, panelId: 'depot',     color: '#d97706', threeColor: 0xd97706, icon: 'ti-crown',           xpReward: 0  },
];

// Station docking proximity window
export const STATION_PROXIMITY = 0.055;

// ============================================================
// XP LEVELS (Spiritual Ranks)
// ============================================================
export const LEVELS: LevelDef[] = [
  { xp: 0,     name: 'Tohum',   icon: '🌱' },
  { xp: 200,   name: 'Filiz',   icon: '🌿' },
  { xp: 500,   name: 'Fidan',   icon: '🪴' },
  { xp: 1000,  name: 'Ağaç',    icon: '🌳' },
  { xp: 2000,  name: 'Orman',   icon: '🌲' },
  { xp: 4000,  name: 'Dağ',     icon: '⛰️' },
  { xp: 7000,  name: 'Yıldız',  icon: '⭐' },
  { xp: 12000, name: 'Güneş',   icon: '☀️' },
  { xp: 20000, name: 'Galaksi', icon: '🌌' },
  { xp: 35000, name: 'Evren',   icon: '♾️' },
];

export function getLevelForXP(xp: number): { level: LevelDef; index: number; nextLevel: LevelDef | null } {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) index = i;
  }
  return {
    level: LEVELS[index],
    index,
    nextLevel: LEVELS[index + 1] ?? null,
  };
}

export function getDepotTier(xp: number): 1 | 2 | 3 | 4 {
  if (xp >= 7000) return 4;
  if (xp >= 2000) return 3;
  if (xp >= 500)  return 2;
  return 1;
}

// ============================================================
// ACHIEVEMENT BADGES
// ============================================================
export const BADGES: BadgeDef[] = [
  { id: 'first_step',   name: 'İlk Adım',      desc: 'İlk ameli kaydettin',              icon: 'ti-shoe'        },
  { id: 'week_warrior', name: '7 Gün Sebat',   desc: '7 gün kesintisiz yolculuk',        icon: 'ti-flame'       },
  { id: 'sukur_master', name: 'Şükür Ehli',    desc: '20 şükür kaydı oluşturuldu',       icon: 'ti-sparkles'    },
  { id: 'zikir_master', name: 'Zikir Halkası', desc: '500 zikir tamamlandı',             icon: 'ti-disc'        },
  { id: 'kuran_dostu',  name: 'Kuran Dostu',   desc: '10 Kuran tefsir notu girildi',     icon: 'ti-book-2'      },
  { id: 'eisen_master', name: 'Zaman Mimarı',  desc: '15 görev tamamlandı',              icon: 'ti-layout-grid' },
  { id: 'hadis_alimi',  name: 'Hadis Âlimi',   desc: '10 Hadis notu girildi',            icon: 'ti-quote'       },
  { id: 'ders_ustası',  name: 'Ders Ustası',   desc: '10 hata & ders kaydı oluşturuldu', icon: 'ti-history'     },
];

// ============================================================
// DAILY ROTATING CONTENT
// ============================================================
export const DAILY_AYETS = [
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', turkish: '"Öyleyse siz beni anın ki ben de sizi anayım. Bana şükredin, nankörlük etmeyin." (Bakara 2:152)' },
  { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', turkish: '"Şüphesiz güçlükle birlikte kolaylık vardır." (İnşirah 94:6)' },
  { arabic: 'وَلَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ', turkish: '"Andolsun eğer şükrederseniz, mutlaka artırırım." (İbrahim 14:7)' },
  { arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', turkish: '"İyi bil ki, kalpler ancak Allah\'ı anmakla huzur bulur." (Ra\'d 13:28)' },
  { arabic: 'وَاللَّهُ مَعَ الصَّابِرِينَ', turkish: '"Allah sabredenlerle beraberdir." (Bakara 2:153)' },
];

export const DAILY_HADISLER = [
  '"İki nimet vardır ki insanların çoğu onlarda aldanmıştır: Sağlık ve boş vakit." (Buhârî)',
  '"Mümin bir kimse başkasına faydalı olduğu sürece Allah da ona faydalı olmaya devam eder." (Müslim)',
  '"Kolaylaştırınız, zorlaştırmayınız; müjdeleyiniz, nefret ettirmeyiniz." (Buhârî)',
  '"Her işte iyiliği esas alın. Allah her şeyi güzel yapmayı emretmiştir." (Müslim)',
  '"Amellerin Allah\'a en sevimlisi, az da olsa devamlı olanıdır." (Buhârî)',
];
