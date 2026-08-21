'use client'

import GrowthTree from './GrowthTree'
import { AppIcon } from '@/components/ui/AppIcon'
import { useAuthStore } from '@/store/useAuthStore'
import { useJourneyStore } from '@/store/useJourneyStore'
import { buildActivityFeed, CATEGORY_META, relativeTime } from '@/lib/activity'
import { getLevelForXP } from '@/lib/constants'

const quickActions = [
  { id: 'daily-wheel', icon: 'refresh', title: 'Bugünün çarkı', note: 'Ayet veya hadis hatırlatması seç' },
  { id: 'journal', icon: 'pencil', title: 'Günlük yaz', note: 'Bugünü birkaç cümleyle kaydet' },
  { id: 'sukur', icon: 'sparkles', title: 'Şükür ekle', note: 'Fark ettiğin bir nimeti yaz' },
  { id: 'quran', icon: 'book-2', title: 'Kur’an notu', note: 'Okuduğundan kalan düşünce' },
  { id: 'matrix', icon: 'layout-grid', title: 'Görev ekle', note: 'Bir sonraki önceliğini seç' },
  { id: 'mescidim', icon: 'building-mosque', title: 'Mescidim', note: 'Kısa bir farkındalık molası' },
]

export default function DashboardView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const store = useJourneyStore()
  const profile = useAuthStore((state) => state.profile)
  const events = buildActivityFeed(store).slice(0, 12)
  const tasks = Object.values(store.eisenhower).flat()
  const done = tasks.filter((task) => task.done).length
  const { level } = getLevelForXP(store.xp)
  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - 6)
  const activeDays = new Set(events.filter((event) => new Date(event.createdAt) >= weekStart).map((event) => new Date(event.createdAt).toISOString().slice(0, 10))).size
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] || 'Yolcu'
  const today = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <div className="view-stack dashboard-view">
      <header className="page-heading dashboard-heading">
        <div><span className="eyebrow">{today.toLocaleUpperCase('tr-TR')}</span><h1>Tekrar hoş geldin, {firstName}.</h1><p>Bugün küçük bir adımla devam edebilirsin. Alanın, yargılamadan ilerlemeni görünür kılar.</p></div>
        <button className="primary-button" onClick={() => onNavigate('journal')}><AppIcon name="plus" /> Yeni kayıt</button>
      </header>

      <div className="dashboard-hero-grid">
        <GrowthTree xp={store.xp} trigger={store.xpOrbTrigger} lastAmount={store.lastXPAmount} />

        <aside className="surface-card today-card" aria-labelledby="today-actions-title">
          <div className="card-heading"><div><span className="eyebrow">BUGÜN</span><h2 id="today-actions-title">Neye alan açacaksın?</h2></div><span className="quiet-chip">1 adım yeter</span></div>
          <div className="quick-actions">
            {quickActions.map((action, index) => <button key={action.id} className={index === 0 ? 'primary-quick' : ''} onClick={() => onNavigate(action.id)}>
              <span className="quick-action-icon"><AppIcon name={action.icon} /></span>
              <span><strong>{action.title}</strong><small>{action.note}</small></span>
              <AppIcon name="arrow-right" />
            </button>)}
          </div>
        </aside>
      </div>

      <section className="dashboard-metrics" aria-label="Bugünkü gelişim özeti">
        <Metric icon="flame" value={store.streak.current} label="Günlük seri" detail="İstikrar günün" tone="amber" />
        <Metric icon="calendar-check" value={`${activeDays}/7`} label="Bu hafta aktif" detail="Son yedi gün" tone="green" />
        <Metric icon="sparkles" value={store.xp.toLocaleString('tr-TR')} label="Toplam XP" detail={`${level.name} seviyesi`} tone="indigo" />
        <Metric icon="circle-check" value={`${done}/${tasks.length}`} label="Tamamlanan görev" detail="Tüm matris" tone="blue" />
      </section>

      <div className="dashboard-lower-grid">
        <section className="surface-card activity-card">
          <div className="card-heading"><div><span className="eyebrow">SON HAREKETLER</span><h2>Faaliyetlerin</h2></div><button className="text-button" onClick={() => onNavigate('reports')}>Tüm raporlar <AppIcon name="arrow-right" /></button></div>
          {events.length === 0 ? <Empty /> : (
            <ol className="activity-list">
              {events.slice(0, 7).map((event) => { const meta = CATEGORY_META[event.category]; return <li key={`${event.category}-${event.id}`}>
                <span className="activity-icon" style={{ color: meta.color, background: `${meta.color}12` }}>{meta.icon}</span>
                <span className="activity-content"><strong>{event.label}</strong><small>{event.detail}</small></span>
                <span className="activity-meta"><b>+{event.xp} XP</b><time dateTime={event.createdAt}>{relativeTime(event.createdAt)}</time></span>
              </li> })}
            </ol>
          )}
        </section>

        <section className="surface-card insight-card">
          <div className="insight-visual" aria-hidden><span><AppIcon name="leaf" /></span><i /><i /><i /></div>
          <span className="eyebrow">HAFTALIK İÇGÖRÜ</span>
          <h2>{activeDays > 0 ? `Bu hafta ${activeDays} farklı günde kendine alan açtın.` : 'Bu haftanın ilk adımı seni bekliyor.'}</h2>
          <p>{activeDays > 0 ? 'İstikrar, yoğunluktan daha değerlidir. Kısa bir kayıt bile yolculuğunun parçası.' : 'Uzun bir başlangıca ihtiyacın yok. Tek bir şükür veya günlük notuyla başlayabilirsin.'}</p>
          <button className="ghost-button" onClick={() => onNavigate('reports')}>Haftayı incele <AppIcon name="chart-line" /></button>
          <p className="ethics-note"><AppIcon name="info-circle" /> XP, yalnızca uygulamadaki düzenli katılımı gösterir; manevi değer veya üstünlük ölçüsü değildir.</p>
        </section>
      </div>
    </div>
  )
}

function Metric({ icon, value, label, detail, tone }: { icon: string; value: string | number; label: string; detail: string; tone: string }) {
  return <article className="metric-card"><span className={`stat-icon ${tone}`}><AppIcon name={icon} /></span><div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div></article>
}

function Empty() {
  return <div className="empty-state compact"><i><AppIcon name="notes" /></i><strong>Henüz bir faaliyetin yok</strong><p>İlk notunla gelişim yolculuğun burada şekillenmeye başlayacak.</p></div>
}
