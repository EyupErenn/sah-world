'use client';

import GrowthTree from './GrowthTree';
import { useJourneyStore } from '@/store/useJourneyStore';
import { buildActivityFeed, CATEGORY_META, relativeTime } from '@/lib/activity';
import { getLevelForXP } from '@/lib/constants';

export default function DashboardView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const store = useJourneyStore();
  const events = buildActivityFeed(store).slice(0, 18);
  const tasks = Object.values(store.eisenhower).flat();
  const done = tasks.filter((task) => task.done).length;
  const { level } = getLevelForXP(store.xp);

  return (
    <div className="view-stack">
      <header className="page-heading">
        <div><span className="eyebrow">BUGÜNÜN ALANI</span><h1>Hoş geldin, yolcu.</h1><p>Kendine dürüstçe bak, küçük bir adım seç ve sakinlikle devam et.</p></div>
        <button className="primary-button" onClick={() => onNavigate('journal')}>+ Yeni kayıt</button>
      </header>

      <div className="stat-grid dashboard-stats">
        <Stat icon="↗" value={store.streak.current} label="Günlük seri" tone="amber" />
        <Stat icon="◎" value={store.xp.toLocaleString('tr-TR')} label={`${level.name} · Toplam XP`} tone="indigo" />
        <Stat icon="✓" value={`${done}/${tasks.length}`} label="Tamamlanan görev" tone="blue" />
        <Stat icon="✦" value={store.sukurList.length} label="Şükür kaydı" tone="green" />
      </div>

      <GrowthTree xp={store.xp} trigger={store.xpOrbTrigger} lastAmount={store.lastXPAmount} />

      <div className="dashboard-lower-grid">
        <section className="surface-card activity-card">
          <div className="card-heading"><div><span className="eyebrow">CANLI AKIŞ</span><h2>Faaliyetler</h2></div><span className="quiet-chip">Son {Math.min(events.length, 18)} kayıt</span></div>
          {events.length === 0 ? <Empty icon="◌" title="Alan henüz sakin" text="İlk kaydını oluşturduğunda gelişim hareketlerin burada görünecek." /> : (
            <ol className="activity-list">
              {events.map((event) => { const meta = CATEGORY_META[event.category]; return <li key={`${event.category}-${event.id}`}>
                <span className="activity-icon" style={{ color: meta.color, background: `${meta.color}12` }}>{meta.icon}</span>
                <span className="activity-content"><strong>{event.label}</strong><small>{event.detail}</small></span>
                <span className="activity-meta"><b>+{event.xp} XP</b><time>{relativeTime(event.createdAt)}</time></span>
              </li>; })}
            </ol>
          )}
        </section>

        <section className="surface-card quick-card">
          <div className="card-heading"><div><span className="eyebrow">KISA YOLLAR</span><h2>Bugün neye alan açacaksın?</h2></div></div>
          <div className="quick-grid">
            {[
              ['journal','✎','Kendimi dinle','Günlük'], ['matrix','⊞','Önceliğimi seç','Matris'],
              ['sukur','✦','Bir nimeti fark et','Şükür'], ['mescidim','◌','Kısa bir mola ver','Mescidim'],
            ].map(([id, icon, title, label]) => <button key={id} onClick={() => onNavigate(id)}><i>{icon}</i><span><strong>{title}</strong><small>{label}</small></span><b>→</b></button>)}
          </div>
          <p className="ethics-note">XP yalnızca uygulamadaki düzenli katılımı gösterir; manevi değer veya üstünlük ölçüsü değildir.</p>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, value, label, tone }: { icon: string; value: string | number; label: string; tone: string }) {
  return <article className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>;
}

function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="empty-state"><i>{icon}</i><strong>{title}</strong><p>{text}</p></div>;
}
