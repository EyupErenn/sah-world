export const DIYANET_CALCULATION_METHOD = 13
export const DIYANET_CALENDAR_METHOD = 'DIYANET'

export type PrayerLocation = {
  city: string
  country: string
  latitude: number | null
  longitude: number | null
}

export type PrayerTimingKey = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'

export type PrayerDay = {
  timings: Record<PrayerTimingKey, string> & Record<string, string>
  date: {
    readable: string
    gregorian: { date: string; day: string; month: { en: string; number: number }; year: string; weekday: { en: string } }
    hijri: { date: string; day: string; month: { ar: string; en: string; number: number }; year: string; weekday: { ar: string; en: string } }
  }
  meta: { timezone: string; method: { id: number; name: string } }
}

type AladhanResponse<T> = { code: number; status: string; data: T }

export const PRAYER_DEFINITIONS: Array<{ key: PrayerTimingKey; label: string; icon: string }> = [
  { key: 'Fajr', label: 'İmsak', icon: 'sunrise' },
  { key: 'Sunrise', label: 'Güneş', icon: 'sun-high' },
  { key: 'Dhuhr', label: 'Öğle', icon: 'sun' },
  { key: 'Asr', label: 'İkindi', icon: 'cloud-sun' },
  { key: 'Maghrib', label: 'Akşam', icon: 'sunset-2' },
  { key: 'Isha', label: 'Yatsı', icon: 'moon-stars' },
]

function apiCountry(country: string): string {
  const normalized = country.trim().toLocaleLowerCase('tr-TR')
  if (['türkiye', 'turkiye', 'tr'].includes(normalized)) return 'Turkey'
  return country.trim() || 'Turkey'
}

function formatApiDate(date: Date): string {
  return [String(date.getDate()).padStart(2, '0'), String(date.getMonth() + 1).padStart(2, '0'), date.getFullYear()].join('-')
}

async function requestAladhan<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  params.set('method', String(DIYANET_CALCULATION_METHOD))
  params.set('calendarMethod', DIYANET_CALENDAR_METHOD)
  const response = await fetch(`https://api.aladhan.com/v1/${path}?${params.toString()}`, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error(`Namaz vakti servisi yanıt vermedi (HTTP ${response.status}).`)
  const payload = await response.json() as AladhanResponse<T>
  if (payload.code !== 200 || !payload.data) throw new Error('Konum için namaz vakti bulunamadı. Şehir ve ülke adını kontrol et.')
  return payload.data
}

function locationParams(location: PrayerLocation): URLSearchParams {
  const params = new URLSearchParams()
  if (location.latitude !== null && location.longitude !== null) {
    params.set('latitude', String(location.latitude))
    params.set('longitude', String(location.longitude))
  } else {
    params.set('city', location.city)
    params.set('country', apiCountry(location.country))
  }
  return params
}

export async function fetchPrayerDay(location: PrayerLocation, date = new Date(), signal?: AbortSignal): Promise<PrayerDay> {
  const params = locationParams(location)
  const endpoint = location.latitude !== null && location.longitude !== null ? `timings/${formatApiDate(date)}` : `timingsByCity/${formatApiDate(date)}`
  return requestAladhan<PrayerDay>(endpoint, params, signal)
}

export async function fetchPrayerCalendar(location: PrayerLocation, year: number, month: number, signal?: AbortSignal): Promise<PrayerDay[]> {
  const params = locationParams(location)
  const endpoint = location.latitude !== null && location.longitude !== null ? `calendar/${year}/${month}` : `calendarByCity/${year}/${month}`
  return requestAladhan<PrayerDay[]>(endpoint, params, signal)
}

export async function reverseGeocode(latitude: number, longitude: number, signal?: AbortSignal): Promise<Pick<PrayerLocation, 'city' | 'country'>> {
  const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), localityLanguage: 'tr' })
  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`, { signal, cache: 'no-store' })
  if (!response.ok) return { city: 'Mevcut Konum', country: 'Türkiye' }
  const data = await response.json() as { city?: string; locality?: string; principalSubdivision?: string; countryName?: string }
  return {
    city: data.city || data.locality || data.principalSubdivision || 'Mevcut Konum',
    country: data.countryName || 'Türkiye',
  }
}

export function cleanPrayerTime(value: string): string {
  return value.match(/\d{1,2}:\d{2}/)?.[0]?.padStart(5, '0') ?? '--:--'
}

export function prayerTimeToMinutes(value: string): number {
  const [hours, minutes] = cleanPrayerTime(value).split(':').map(Number)
  return hours * 60 + minutes
}

export function getZonedClock(timezone: string, date = new Date()): { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  return { hour: read('hour'), minute: read('minute'), second: read('second') }
}

export function getPrayerPeriod(day: PrayerDay, date = new Date()) {
  const clock = getZonedClock(day.meta.timezone, date)
  const currentMinute = clock.hour * 60 + clock.minute + clock.second / 60
  const points = PRAYER_DEFINITIONS.map((prayer) => ({ ...prayer, minute: prayerTimeToMinutes(day.timings[prayer.key]) }))
  let nextIndex = points.findIndex((point) => point.minute > currentMinute)
  if (nextIndex === -1) nextIndex = 0
  const activeIndex = (nextIndex - 1 + points.length) % points.length
  const afterLast = nextIndex === 0 && currentMinute >= points.at(-1)!.minute
  const nextMinute = afterLast ? points[0].minute + 1440 : points[nextIndex].minute
  const previousMinute = nextIndex === 0 ? (afterLast ? points.at(-1)!.minute : points.at(-1)!.minute - 1440) : points[activeIndex].minute
  const adjustedCurrent = currentMinute
  const secondsUntilNext = Math.max(0, Math.round((nextMinute - adjustedCurrent) * 60))
  const progress = Math.min(1, Math.max(0, (adjustedCurrent - previousMinute) / Math.max(1, nextMinute - previousMinute)))
  return { next: points[nextIndex], active: points[activeIndex], secondsUntilNext, progress }
}

export function formatPrayerCountdown(seconds: number): string {
  const totalMinutes = Math.max(0, Math.ceil(seconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours && minutes) return `${hours} saat ${minutes} dakika`
  if (hours) return `${hours} saat`
  return `${Math.max(1, minutes)} dakika`
}

export function formatGregorianDate(day: PrayerDay): string {
  const [date, month, year] = day.date.gregorian.date.split('-').map(Number)
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, date))
}

export function formatHijriDate(day: PrayerDay): string {
  const months = ['Muharrem', 'Safer', 'Rebiülevvel', 'Rebiülahir', 'Cemaziyelevvel', 'Cemaziyelahir', 'Recep', 'Şaban', 'Ramazan', 'Şevval', 'Zilkade', 'Zilhicce']
  return `${day.date.hijri.day} ${months[day.date.hijri.month.number - 1] ?? day.date.hijri.month.en} ${day.date.hijri.year}`
}
