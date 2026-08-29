'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'
import GrowthTree from './GrowthTree'
import PurposeEquation from './PurposeEquation'
import { AppIcon } from '@/components/ui/AppIcon'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { useAuthStore } from '@/store/useAuthStore'
import { useJourneyStore } from '@/store/useJourneyStore'
import { buildActivityFeed, CATEGORY_META, dayKey, getCategoryCounts, mapIntegratedActivities, relativeTime, type ActivityCategory } from '@/lib/activity'
import { getLevelForXP } from '@/lib/constants'
import { useActivityLog } from '@/hooks/useActivityLog'

const quickActions = [
  { id: 'focus', icon: 'target-arrow', title: 'Odaklan', note: 'Kesintisiz bir çalışma alanı aç' },
  { id: 'daily-wheel', icon: 'refresh', title: 'Bugünün çarkı', note: 'Ayet veya hadis hatırlatması seç' },
  { id: 'journal', icon: 'pencil', title: 'Günlük yaz', note: 'Bugünü birkaç cümleyle kaydet' },
  { id: 'sukur', icon: 'sparkles', title: 'Şükür ekle', note: 'Fark ettiğin bir nimeti yaz' },
  { id: 'matrix', icon: 'layout-grid', title: 'Görev ekle', note: 'Bir sonraki önceliğini seç' },
  { id: 'mescidim', icon: 'building-mosque', title: 'Mescidim', note: 'Kısa bir farkındalık molası' },
]

export default function DashboardView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const store = useJourneyStore()
  const profile = useAuthStore((state) => state.profile)
  const remoteActivity = useActivityLog()
  const events = remoteActivity.items.length ? mapIntegratedActivities(remoteActivity.items) : buildActivityFeed(store)
  const counts = getCategoryCounts(store)
  const tasks = Object.values(store.eisenhower).flat()
  const done = tasks.filter((task) => task.done).length
  const { level } = getLevelForXP(store.xp)
  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - 6)
  const activeDays = new Set(events.filter((event) => new Date(event.createdAt) >= weekStart).map((event) => dayKey(event.createdAt))).size
  const weekEvents = events.filter((event) => new Date(event.createdAt) >= weekStart)
  const weeklyCategory = (Object.entries(weekEvents.reduce<Record<string, number>>((result, event) => ({ ...result, [event.category]: (result[event.category] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'journal') as ActivityCategory
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] || 'Yolcu'
  const today = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const todayKey = dayKey(new Date())
  const hasActivityToday = events.some((event) => dayKey(event.createdAt) === todayKey)
  const hour = new Date().getHours()
  const streakAtRisk = hour >= 20 && !hasActivityToday && store.streak.lastDate !== todayKey
  const personalizedActions = useMemo(() => {
    const usage: Record<string, number> = { focus: counts.focus, journal: counts.journal, quran: counts.quran, hadis: counts.hadis, sukur: counts.sukur, matrix: counts.matrix, mescidim: counts.mescidim }
    return quickActions.filter((action) => !['daily-wheel', 'focus'].includes(action.id)).sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0)).slice(0, 2)
  }, [counts.focus, counts.hadis, counts.journal, counts.matrix, counts.mescidim, counts.quran, counts.sukur])
  const suggested = personalizedActions[0] ?? quickActions[2]
  const ritualMessage = hour < 12 ? 'Güne sakin bir notla başlamak ister misin?' : hour < 18 ? 'Bugünden sende kalanları iki dakikada kaydedebilirsin.' : 'Günü kapatmadan önce kendine kısa bir alan aç.'

  return (
    <div className="view-stack dashboard-view">
      <header className="page-heading dashboard-heading">
        <div><span className="eyebrow">{today.toLocaleUpperCase('tr-TR')}</span><h1>Tekrar hoş geldin, {firstName}.</h1><p>Bugün küçük bir adımla devam edebilirsin. Alanın, yargılamadan ilerlemeni görünür kılar.</p></div>
        <button className="primary-button" onClick={() => onNavigate('journal')}><AppIcon name="plus" /> Yeni kayıt</button>
      </header>

      {!hasActivityToday && <motion.section className={`daily-ritual-card ${streakAtRisk ? 'at-risk' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <span className="ritual-icon"><AppIcon name={streakAtRisk ? 'flame' : 'sunrise'} /></span><div><span className="eyebrow">{streakAtRisk ? 'SERİNİ KORUMAK İÇİN' : 'BUGÜNÜN KÜÇÜK RİTÜELİ'}</span><h2>{streakAtRisk ? 'Bugün için tek bir küçük kayıt yeter.' : ritualMessage}</h2><p>{streakAtRisk ? 'Bunu bir görev gibi değil, günün içinde kendine dönmek için kısa bir durak gibi düşün.' : `${suggested.title}, son dönemde en sık kullandığın alanlardan biri.`}</p></div>
        <button onClick={() => onNavigate(suggested.id)}>{suggested.title}<AppIcon name="arrow-right" /></button>
      </motion.section>}

      <div className="dashboard-hero-grid">
        <div className="dashboard-growth-stack">
          <GrowthTree xp={store.xp} trigger={store.xpOrbTrigger} lastAmount={store.lastXPAmount} />
          <PurposeEquation />
        </div>

        <aside className="surface-card today-card" aria-labelledby="today-actions-title">
          <div className="card-heading"><div><span className="eyebrow">BUGÜN</span><h2 id="today-actions-title">Neye alan açacaksın?</h2></div><span className="quiet-chip">1 adım yeter</span></div>
          <div className="quick-actions">
            {[quickActions[0], quickActions[1], ...personalizedActions].map((action, index) => <button key={action.id} className={index === 0 ? 'primary-quick' : ''} onClick={() => onNavigate(action.id)}>
              <span className="quick-action-icon"><AppIcon name={action.icon} /></span>
              <span><strong>{action.title}</strong><small>{action.note}</small></span>
              <AppIcon name="arrow-right" />
            </button>)}
          </div>
        </aside>
      </div>

      <button className="awareness-invitation" onClick={() => onNavigate('awareness')}>
        <span className="invitation-symbol"><AppIcon name="world-heart" /></span>
        <span><small>YENİ FARKINDALIK ALANI</small><strong>Mazlum Coğrafyaları kültürleri ve kaynaklarıyla tanı</strong><em>Filistin ve Doğu Türkistan için kaynaklı anlatılar, güvenilir eylem rehberi ve 10’ar soruluk bilgi testleri.</em></span>
        <b>Alanı keşfet <AppIcon name="arrow-right" /></b>
      </button>

      <section className="dashboard-metrics" aria-label="Bugünkü gelişim özeti">
        <Metric icon="flame" value={store.streak.current} label="Günlük seri" detail="İstikrar günün" tone="amber" />
        <Metric icon="calendar-check" value={activeDays} suffix="/7" label="Bu hafta aktif" detail="Son yedi gün" tone="green" />
        <Metric icon="sparkles" value={store.xp} label="Toplam XH" detail={`${level.name} seviyesi`} tone="indigo" />
        <Metric icon="circle-check" value={done} suffix={`/${tasks.length}`} label="Tamamlanan görev" detail="Tüm matris" tone="blue" />
      </section>

      <div className="dashboard-lower-grid">
        <section className="surface-card activity-card">
          <div className="card-heading"><div><span className="eyebrow">SON HAREKETLER</span><h2>Faaliyetlerin</h2></div><button className="text-button" onClick={() => onNavigate('reports')}>Tüm raporlar <AppIcon name="arrow-right" /></button></div>
          {events.length === 0 ? <Empty /> : (
            <motion.ol className="activity-list" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: .045 } } }}>
              {events.slice(0, 7).map((event) => { const meta = CATEGORY_META[event.category]; return <motion.li key={`${event.category}-${event.id}`} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
                <button className="activity-row" onClick={() => onNavigate(event.category === 'profession' ? 'profession-school' : event.category)} aria-label={`${event.label} kaydını ${meta.label} bölümünde aç`}>
                  <span className="activity-icon" style={{ color: meta.color, background: `${meta.color}12` }}><AppIcon name={meta.icon} /></span>
                  <span className="activity-content"><small className="activity-category" style={{ color: meta.color }}>{meta.label}</small><strong>{event.label}</strong><small>{event.detail}</small></span>
                  <span className="activity-meta"><b>+{event.xp} XH</b><time dateTime={event.createdAt}>{relativeTime(event.createdAt)}</time></span><AppIcon name="chevron-right" />
                </button>
              </motion.li> })}
            </motion.ol>
          )}
        </section>

        <section className="surface-card insight-card">
          <div className="insight-visual" aria-hidden><span><AppIcon name="leaf" /></span><i /><i /><i /></div>
          <span className="eyebrow">HAFTALIK İÇGÖRÜ</span>
          <h2>{activeDays > 0 ? `Bu hafta en çok ${CATEGORY_META[weeklyCategory].label} alanına döndün.` : 'Bu haftanın ilk adımı seni bekliyor.'}</h2>
          <p>{activeDays > 0 ? `${weekEvents.length} küçük hareket, ${activeDays} farklı güne yayıldı. Ritminin hangi alanlarda güçlendiğini raporlarında görebilirsin.` : 'Uzun bir başlangıca ihtiyacın yok. Tek bir şükür veya günlük notuyla başlayabilirsin.'}</p>
          <button className="ghost-button" onClick={() => onNavigate('reports')}>Haftayı incele <AppIcon name="chart-line" /></button>
          <p className="ethics-note"><AppIcon name="info-circle" /> XH, yalnızca uygulamadaki düzenli katılımı gösterir; manevi değer veya üstünlük ölçüsü değildir.</p>
        </section>
      </div>
    </div>
  )
}

function Metric({ icon, value, suffix = '', label, detail, tone }: { icon: string; value: number; suffix?: string; label: string; detail: string; tone: string }) {
  return <article className="metric-card"><span className={`stat-icon ${tone}`}><AppIcon name={icon} /></span><div><small>{label}</small><strong><AnimatedNumber value={value} suffix={suffix} /></strong><span>{detail}</span></div></article>
}

function Empty() {
  return <div className="empty-state compact"><i><AppIcon name="notes" /></i><strong>Yolculuğun ilk izi seni bekliyor</strong><p>Bugünden tek bir cümle bırak; zaman akışın sakin sakin şekillenmeye başlasın.</p></div>
}
