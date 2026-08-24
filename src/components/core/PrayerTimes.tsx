'use client'

import { useEffect, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { supabase } from '@/lib/supabase'
import {
  DIYANET_CALCULATION_METHOD,
  PRAYER_DEFINITIONS,
  cleanPrayerTime,
  fetchPrayerCalendar,
  fetchPrayerDay,
  formatGregorianDate,
  formatHijriDate,
  formatPrayerCountdown,
  getPrayerPeriod,
  getZonedClock,
  reverseGeocode,
  type PrayerDay,
  type PrayerLocation,
} from '@/lib/prayerTimes'
import { useAuthStore } from '@/store/useAuthStore'
import { useJourneyStore } from '@/store/useJourneyStore'

type CalendarView = 'today' | 'week' | 'month'
const LOCATION_BACKUP_KEY = 'sah-prayer-location-v1'
const NOTIFICATION_KEY = 'sah-prayer-notifications-v1'

export default function PrayerTimes({ reward }: { reward: (amount: number, label: string, sourceType: string, sourceId: string) => void }) {
  const { user, profile, patchProfile } = useAuthStore()
  const journey = useJourneyStore()
  const [location, setLocation] = useState<PrayerLocation | null>(null)
  const [selectingLocation, setSelectingLocation] = useState(false)
  const [day, setDay] = useState<PrayerDay | null>(null)
  const [calendar, setCalendar] = useState<PrayerDay[]>([])
  const [calendarView, setCalendarView] = useState<CalendarView>('today')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(0)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  useEffect(() => {
    const profileLocation = profile?.location_city ? {
      city: profile.location_city,
      country: profile.location_country || 'Türkiye',
      latitude: profile.location_lat,
      longitude: profile.location_lng,
    } satisfies PrayerLocation : null
    let backup: PrayerLocation | null = null
    try { backup = JSON.parse(window.localStorage.getItem(LOCATION_BACKUP_KEY) || 'null') as PrayerLocation | null } catch {}
    const timer = window.setTimeout(() => {
      setLocation(profileLocation || backup)
      setSelectingLocation(!profileLocation && !backup)
      setNotificationsEnabled(window.localStorage.getItem(NOTIFICATION_KEY) === '1')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [profile?.location_city, profile?.location_country, profile?.location_lat, profile?.location_lng])

  useEffect(() => {
    if (!location) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const today = new Date()
        const [todayData, monthData] = await Promise.all([
          fetchPrayerDay(location, today, controller.signal),
          fetchPrayerCalendar(location, today.getFullYear(), today.getMonth() + 1, controller.signal),
        ])
        setDay(todayData)
        setCalendar(monthData)
      } catch (loadError) {
        if (controller.signal.aborted) return
        setError(loadError instanceof Error ? loadError.message : 'Namaz vakitleri yüklenemedi.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [location])

  useEffect(() => {
    if (!day) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [day])

  useEffect(() => {
    if (!notificationsEnabled || !day || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const check = () => {
      const clock = getZonedClock(day.meta.timezone)
      const current = `${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')}`
      const prayer = PRAYER_DEFINITIONS.find((item) => cleanPrayerTime(day.timings[item.key]) === current)
      if (!prayer || prayer.key === 'Sunrise') return
      const notificationId = `sah-prayer-notified-${day.date.gregorian.date}-${prayer.key}`
      if (window.localStorage.getItem(notificationId)) return
      window.localStorage.setItem(notificationId, '1')
      new Notification(`SAH · ${prayer.label} vakti`, { body: `${location?.city || 'Konumun'} için ${prayer.label} vakti geldi.`, icon: '/favicon.ico' })
    }
    check()
    const interval = window.setInterval(check, 30_000)
    return () => window.clearInterval(interval)
  }, [day, location?.city, notificationsEnabled])

  const saveLocation = async (nextLocation: PrayerLocation) => {
    window.localStorage.setItem(LOCATION_BACKUP_KEY, JSON.stringify(nextLocation))
    // Development guest data is intentionally local-only; authenticated profiles sync to Supabase.
    if (user && user.id !== 'guest-user-123') {
      const patch = {
        location_city: nextLocation.city,
        location_country: nextLocation.country,
        location_lat: nextLocation.latitude,
        location_lng: nextLocation.longitude,
      }
      const { error: updateError } = await supabase.from('profiles').update(patch).eq('id', user.id)
      if (updateError) throw new Error('Konum profiline kaydedilemedi. Lütfen tekrar dene.')
      patchProfile(patch)
    }
    setError('')
    setLocation(nextLocation)
    setSelectingLocation(false)
  }

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) { setError('Bu tarayıcı konum paylaşımını desteklemiyor. Şehir aramasını kullanabilirsin.'); return }
    setLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const latitude = Number(position.coords.latitude.toFixed(5))
        const longitude = Number(position.coords.longitude.toFixed(5))
        const labels = await reverseGeocode(latitude, longitude, AbortSignal.timeout(12_000))
        const candidate: PrayerLocation = { ...labels, latitude, longitude }
        await fetchPrayerDay(candidate, new Date(), AbortSignal.timeout(20_000))
        await saveLocation(candidate)
      } catch (locationError) {
        setError(locationError instanceof Error ? locationError.message : 'Konum doğrulanamadı.')
      } finally { setLoading(false) }
    }, (geoError) => {
      const message = geoError.code === geoError.PERMISSION_DENIED ? 'Konum izni verilmedi. Şehir adını yazarak devam edebilirsin.' : 'Konum alınamadı. Şehir adını yazarak devam edebilirsin.'
      setError(message)
      setLoading(false)
    }, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 15 * 60_000 })
  }

  const searchCity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = String(new FormData(event.currentTarget).get('city') || '').trim()
    if (query.length < 2) { setError('Lütfen geçerli bir şehir adı yaz.'); return }
    const [city, enteredCountry] = query.split(',').map((part) => part.trim())
    const candidate: PrayerLocation = { city, country: enteredCountry || 'Türkiye', latitude: null, longitude: null }
    setLoading(true)
    setError('')
    try {
      await fetchPrayerDay(candidate, new Date(), AbortSignal.timeout(20_000))
      await saveLocation(candidate)
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Şehir bulunamadı.')
    } finally { setLoading(false) }
  }

  const toggleNotifications = async () => {
    if (typeof Notification === 'undefined') { setError('Bu tarayıcı bildirimleri desteklemiyor.'); return }
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setError('Bildirim izni verilmedi. Tarayıcı ayarlarından daha sonra açabilirsin.'); return }
    }
    const next = !notificationsEnabled
    setNotificationsEnabled(next)
    window.localStorage.setItem(NOTIFICATION_KEY, next ? '1' : '0')
  }

  const tapTespih = () => {
    const target = 33
    journey.incrementTespih()
    if (journey.currentTespih + 1 >= target) {
      const id = crypto.randomUUID()
      journey.resetTespih()
      reward(30, '33 zikir tamamlandı', 'mescidim', id)
    }
  }

  if (selectingLocation || !location) return <div className="mescid-stack">
    <LocationSetup loading={loading} error={error} onGeolocate={() => void handleUseMyLocation()} onSearch={searchCity} onCancel={location ? () => { setError(''); setSelectingLocation(false) } : undefined} />
    <SpiritualTools count={journey.currentTespih} total={journey.totalZikir} onTap={tapTespih} onReset={journey.resetTespih} />
  </div>

  const period = day ? getPrayerPeriod(day, now ? new Date(now) : new Date()) : null
  const currentDateIndex = day ? calendar.findIndex((item) => item.date.gregorian.date === day.date.gregorian.date) : 0
  const rows = calendarView === 'week' ? calendar.slice(Math.max(0, currentDateIndex), Math.max(0, currentDateIndex) + 7) : calendar

  return <div className="mescid-stack">
    <section className="surface-card prayer-hero">
      <header className="prayer-location-header">
        <div><span className="eyebrow">DİYANET HESAPLAMA YÖNTEMİ · {DIYANET_CALCULATION_METHOD}</span><h2><AppIcon name="map-pin" /> {location.city}, {location.country}</h2>{day && <p>{formatGregorianDate(day)} <i /> {formatHijriDate(day)}</p>}</div>
        <div className="prayer-header-actions"><button onClick={() => void toggleNotifications()} className={notificationsEnabled ? 'active' : ''}><AppIcon name={notificationsEnabled ? 'bell-ringing' : 'bell'} /> {notificationsEnabled ? 'Bildirim açık' : 'Bildirim al'}</button><button onClick={() => { setError(''); setSelectingLocation(true) }}>Değiştir</button></div>
      </header>

      {error && <div className="prayer-error" role="alert"><AppIcon name="alert-circle" /> <span>{error}</span><button onClick={() => setLocation({ ...location })}>Tekrar dene</button></div>}
      {loading && !day ? <PrayerSkeleton /> : day && period ? <>
        <div className="prayer-next-banner">
          <span><AppIcon name="clock" /></span>
          <div><small>SONRAKİ VAKİT</small><strong>{period.next.label}</strong><p>{formatPrayerCountdown(period.secondsUntilNext)} sonra</p></div>
          <div className="prayer-countdown">{String(Math.floor(period.secondsUntilNext / 3600)).padStart(2, '0')}<i>:</i>{String(Math.floor((period.secondsUntilNext % 3600) / 60)).padStart(2, '0')}<i>:</i>{String(period.secondsUntilNext % 60).padStart(2, '0')}</div>
        </div>
        <div className="prayer-progress-copy"><span><b>{period.active.label}</b> döneminden <b>{period.next.label}</b> vaktine ilerliyorsun</span><strong>{Math.round(period.progress * 100)}%</strong></div>
        <div className="prayer-progress"><i style={{ width: `${period.progress * 100}%` }} /></div>
        <div className="prayer-cards">{PRAYER_DEFINITIONS.map((prayer) => <article key={prayer.key} className={`${period.next.key === prayer.key ? 'next' : ''} ${period.active.key === prayer.key ? 'active' : ''}`}>
          <span><AppIcon name={prayer.icon} /></span><small>{prayer.label}</small><strong>{cleanPrayerTime(day.timings[prayer.key])}</strong>{period.next.key === prayer.key && <em>Sıradaki</em>}{period.active.key === prayer.key && period.next.key !== prayer.key && <em>Şu an</em>}
        </article>)}</div>
        <p className="prayer-source-note"><AppIcon name="info-circle" /> Vakitler Aladhan üzerinden Diyanet İşleri Başkanlığı yöntemiyle hesaplanır. Yerel resmî takvimde küçük dakika farkları olabilir. Bildirimler tarayıcı ve Mescidim ekranı açıkken çalışır.</p>
      </> : null}
    </section>

    {day && calendar.length > 0 && <section className="surface-card prayer-calendar-card">
      <div className="card-heading"><div><span className="eyebrow">PLANINI ÖNCEDEN GÖR</span><h2>Vakit takvimi</h2></div><div className="prayer-view-toggle">{([['today', 'Bugün'], ['week', '7 Gün'], ['month', 'Bu Ay']] as Array<[CalendarView, string]>).map(([value, label]) => <button key={value} className={calendarView === value ? 'active' : ''} onClick={() => setCalendarView(value)}>{label}</button>)}</div></div>
      {calendarView === 'today' ? <div className="prayer-today-detail"><AppIcon name="calendar-event" /><div><strong>{formatGregorianDate(day)}</strong><span>{formatHijriDate(day)} · {location.city}</span></div><small>Son güncelleme canlı API verisidir.</small></div> : <PrayerCalendarTable rows={rows} todayDate={day.date.gregorian.date} />}
    </section>}

    <SpiritualTools count={journey.currentTespih} total={journey.totalZikir} onTap={tapTespih} onReset={journey.resetTespih} />
  </div>
}

function LocationSetup({ loading, error, onGeolocate, onSearch, onCancel }: { loading: boolean; error: string; onGeolocate: () => void; onSearch: (event: React.FormEvent<HTMLFormElement>) => void; onCancel?: () => void }) {
  return <section className="surface-card prayer-location-setup">
    <div className="prayer-location-art"><span><AppIcon name="building-mosque" /></span><i /><i /><i /></div>
    <div className="prayer-location-content"><span className="eyebrow">SANA ÖZEL VAKİTLER</span><h2>Namaz vakitlerini görmek için konumunu paylaş</h2><p>İzin verdiğinde yalnızca vakit hesabı için yaklaşık koordinatın kullanılır. Dilersen şehir adını yazarak da devam edebilirsin.</p>
      <button className="prayer-location-primary" onClick={onGeolocate} disabled={loading}><AppIcon name="current-location" /> {loading ? 'Konum doğrulanıyor…' : 'Konumumu Kullan'}</button>
      <div className="location-divider"><span>veya şehir ara</span></div>
      <form onSubmit={onSearch}><label><AppIcon name="search" /><input name="city" placeholder="İstanbul veya İstanbul, Türkiye" aria-label="Şehir ara" autoComplete="address-level2" /></label><button type="submit" disabled={loading}>Vakitleri getir</button></form>
      {error && <p className="prayer-setup-error" role="alert"><AppIcon name="alert-circle" /> {error}</p>}
      {onCancel && <button className="prayer-location-cancel" onClick={onCancel}>Mevcut konuma dön</button>}
    </div>
  </section>
}

function PrayerCalendarTable({ rows, todayDate }: { rows: PrayerDay[]; todayDate: string }) {
  return <div className="prayer-table-scroll"><table className="prayer-calendar-table"><thead><tr><th>Tarih</th>{PRAYER_DEFINITIONS.map((prayer) => <th key={prayer.key}>{prayer.label}</th>)}</tr></thead><tbody>{rows.map((row) => {
    const [day, month, year] = row.date.gregorian.date.split('-').map(Number)
    const dateLabel = new Intl.DateTimeFormat('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(year, month - 1, day))
    return <tr key={row.date.gregorian.date} className={row.date.gregorian.date === todayDate ? 'today' : ''}><th><strong>{dateLabel}</strong><span>{formatHijriDate(row)}</span></th>{PRAYER_DEFINITIONS.map((prayer) => <td key={prayer.key}>{cleanPrayerTime(row.timings[prayer.key])}</td>)}</tr>
  })}</tbody></table></div>
}

function SpiritualTools({ count, total, onTap, onReset }: { count: number; total: number; onTap: () => void; onReset: () => void }) {
  return <div className="workspace-grid mescid-tools"><section className="surface-card tespih-card"><span className="eyebrow">SAKİN BİR RİTİM</span><div className="tespih-ring"><button onClick={onTap} aria-label="Zikir sayacını artır"><strong>{count}</strong><span>/ 33</span></button></div><p>Her dokunuşu acele etmeden, farkındalıkla yap.</p><button className="ghost-button" onClick={onReset}>Sayacı sıfırla</button></section><section className="surface-card reflection-card"><span className="eyebrow">BUGÜNÜN HATIRLATMASI</span><h2>Az da olsa devamlı olan</h2><blockquote>“Amellerin en sevimlisi, az da olsa devamlı olanıdır.”</blockquote><p>Bu alan bir ibadet ölçümü değildir; yalnızca kişisel takibine yardımcı olan sade bir sayaçtır.</p><div className="metric-row"><span>Toplam sayaç</span><strong>{total.toLocaleString('tr-TR')}</strong></div></section></div>
}

function PrayerSkeleton() {
  return <div className="prayer-skeleton" aria-busy="true" aria-label="Namaz vakitleri yükleniyor"><span /><div>{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div></div>
}
