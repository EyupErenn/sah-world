import type { ActivityCategory, ActivityEvent } from '@/lib/activity'

export type GrowthInputKey =
  | 'focus'
  | 'quran'
  | 'sukur'
  | 'journal'
  | 'lessons'
  | 'profession'
  | 'mescidim'

export type GrowthInput = {
  id: GrowthInputKey
  label: string
  accessibleLabel: string
  icon: string
  target: string
  accent: string
  metaphor: string
  count: number
  daily: number[]
  weightedScore: number
  intensity: number
  status: 'sessiz' | 'filizleniyor' | 'güçlü'
  path: string
}

type GrowthInputDefinition = Omit<
  GrowthInput,
  'count' | 'daily' | 'weightedScore' | 'intensity' | 'status'
> & { categories: ActivityCategory[] }

const INPUT_DEFINITIONS: GrowthInputDefinition[] = [
  {
    id: 'quran',
    label: 'Kur’an Kardeşim',
    accessibleLabel: 'Kur’an’ı Kerim Kardeşim',
    icon: 'book-2',
    target: 'quran-companion',
    accent: '#e8b949',
    metaphor: 'Kur’an’la kurulan bağ, köklere ulaşan bir su gibi iç dünyayı besler.',
    categories: ['quran', 'hadis'],
    path: 'M 160 112 C 242 118, 270 176, 322 224',
  },
  {
    id: 'focus',
    label: 'Odaklanma',
    accessibleLabel: 'Odaklanma Zamanlayıcısı',
    icon: 'sun-high',
    target: 'focus',
    accent: '#8ea5ff',
    metaphor: 'Odaklanmış dikkat, büyümeye yön veren ışık gibidir.',
    categories: ['focus'],
    path: 'M 660 112 C 578 118, 548 176, 498 224',
  },
  {
    id: 'sukur',
    label: 'Şükür',
    accessibleLabel: 'Şükür Defterim',
    icon: 'sparkles',
    target: 'sukur',
    accent: '#f5b94f',
    metaphor: 'Fark edilen nimetler, gelişim sahnesine sıcaklık ve canlılık katar.',
    categories: ['sukur'],
    path: 'M 160 302 C 221 302, 256 288, 304 274',
  },
  {
    id: 'lessons',
    label: 'Hatalar & Dersler',
    accessibleLabel: 'Hatalar ve Dersler',
    icon: 'cut',
    target: 'lessons',
    accent: '#f17a8e',
    metaphor: 'Şefkatle çıkarılan dersler, budama gibi daha sağlıklı büyümeye alan açar.',
    categories: ['lessons'],
    path: 'M 660 302 C 599 302, 564 288, 516 274',
  },
  {
    id: 'journal',
    label: 'Günlük',
    accessibleLabel: 'Günlük',
    icon: 'notebook',
    target: 'journal',
    accent: '#b99aff',
    metaphor: 'Kendine dönüp yazmak, görünür gelişimi taşıyan kökleri derinleştirir.',
    categories: ['journal'],
    path: 'M 160 548 C 250 520, 272 448, 330 402',
  },
  {
    id: 'profession',
    label: 'Meslek & Ahlak',
    accessibleLabel: 'Meslek ve Ahlak Okulu',
    icon: 'certificate',
    target: 'profession-school',
    accent: '#9e86ff',
    metaphor: 'Bilgiyle ahlakın birlikteliği, gövdeye dayanıklılık kazandırır.',
    categories: ['profession'],
    path: 'M 660 548 C 570 520, 548 448, 490 402',
  },
  {
    id: 'mescidim',
    label: 'Mescidim',
    accessibleLabel: 'Mescidim',
    icon: 'building-mosque',
    target: 'mescidim',
    accent: '#68d9ad',
    metaphor: 'Dua, esmâ ve tefekkür; bütün sahneyi saran sakin bir atmosfer kurar.',
    categories: ['mescidim'],
    path: 'M 410 62 C 410 92, 410 112, 410 136',
  },
]

const DAY_MS = 86_400_000

/**
 * Son yedi günün birleşik faaliyet akışını, diyagramın yedi gelişim girdisine
 * dönüştürür. Yakın tarihli hareketler daha yüksek ağırlık alır; sonuç yalnızca
 * görsel yoğunluk üretir ve hiçbir kullanıcı verisini değiştirmez.
 */
export function buildGrowthInputs(
  events: ActivityEvent[],
  now = Date.now(),
): GrowthInput[] {
  // Seven local calendar days, including today (not a rolling 168-hour window).
  // Date arithmetic rather than millisecond division also handles DST days.
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - 6 + index)
    return date.getTime()
  })
  const start = days[0]

  return INPUT_DEFINITIONS.map(({ categories, ...definition }) => {
    const matching = events.filter((event) => {
      const occurredAt = Date.parse(event.createdAt)
      return categories.includes(event.category) && occurredAt >= start && occurredAt <= now
    })
    const weightedScore = matching.reduce((score, event) => {
      const ageInDays = Math.max(0, (now - Date.parse(event.createdAt)) / DAY_MS)
      return score + Math.max(0.2, 1 - ageInDays / 8)
    }, 0)
    const daily = days.map((day, index) => matching.filter((event) => {
      const timestamp = Date.parse(event.createdAt)
      return timestamp >= day && timestamp < (days[index + 1] ?? now + 1)
    }).length)
    const intensity = matching.length === 0
      ? 0.12
      : Math.min(1, 0.28 + Math.log2(1 + weightedScore) / 2.7)
    const status = matching.length === 0
      ? 'sessiz'
      : intensity >= 0.78
        ? 'güçlü'
        : 'filizleniyor'

    return {
      ...definition,
      count: matching.length,
      daily,
      weightedScore,
      intensity,
      status,
    }
  })
}

export function growthInputForCategory(category: ActivityCategory): GrowthInputKey | null {
  if (category === 'hadis') return 'quran'
  return INPUT_DEFINITIONS.find((input) => input.categories.includes(category))?.id ?? null
}
