'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { AppIcon } from '@/components/ui/AppIcon';
import { useAuthStore } from '@/store/useAuthStore';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useFocusTimerStore } from '@/store/useFocusTimerStore';
import { useActivityLog } from '@/hooks/useActivityLog';
import { buildActivityFeed, dayKey, mapIntegratedActivities } from '@/lib/activity';
import { getLevelForXP } from '@/lib/constants';
import { openAppView } from '@/lib/appLocation';
import { supabase } from '@/lib/supabase';
import { isValidUUID } from '@/store/useJourneyStore';
const GrowthTree = dynamic(() => import('./GrowthTree'), { loading: () => <p role="status">Gelişim sahnen yükleniyor…</p> });

export default function DailyHomeView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const journey = useJourneyStore();
  const owner = useAuthStore(state => state.user?.id ?? 'local');
  const timerActive = useFocusTimerStore(state => state.isActive);
  const activity = useActivityLog();
  const events = activity.items.length ? mapIntegratedActivities(activity.items) : buildActivityFeed(journey);
  const { level, nextLevel } = getLevelForXP(journey.xp);
  const progress = nextLevel ? Math.max(0, Math.min(100, Math.round((journey.xp - level.xp) / (nextLevel.xp - level.xp) * 100))) : 100;
  const [expanded, setExpanded] = useState(false);
  const [resume, setResume] = useState<{ label: string; detail: string; view: 'journal' | 'focus' | 'quran-companion'; tab?: string }>({ label: 'Kendine bir cümle bırak', detail: 'Henüz açık bir çalışma yok. Bugünün ilk izini oluşturabilirsin.', view: 'journal' });
  const today = dayKey(new Date());
  const start = new Date(`${today}T00:00:00`); start.setDate(start.getDate() - 6);
  const activeDays = new Set(events.filter(event => new Date(event.createdAt) >= start && new Date(event.createdAt) <= new Date()).map(event => dayKey(event.createdAt))).size;
  const todayEntry = journey.journal.find(entry => entry.date === today);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (timerActive) { if(active)setResume({ label: 'Odak oturumuna geri dön', detail: 'Devam eden oturumun korunuyor.', view: 'focus' }); return; }
      try {
        const prefix = `sah-journal-draft-v1:${owner}:${today}:`;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key?.startsWith(prefix)) continue;
          const draft = JSON.parse(localStorage.getItem(key) ?? '{}');
          if (typeof draft.content === 'string' && draft.content.trim()) {
            if(active)setResume({ label: 'Günlük sayfana devam et', detail: 'Bu cihazda saklanan sayfanı aç ve kaldığın yerden devam et.', view: 'journal' }); return;
          }
        }
      } catch { /* A broken browser draft does not block the daily action. */ }
      if (!isValidUUID(owner)) return;
      const { data } = await supabase.from('quran_study_goals').select('title,progress_percent').eq('user_id', owner).lt('progress_percent', 100).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (active && data) setResume({ label: data.title, detail: `Kur’an çalışma hedefin · %${data.progress_percent} tamamlandı`, view: 'quran-companion', tab: 'study' });
    };
    void load(); return () => { active = false; };
  }, [owner, timerActive, today]);

  return <div className="daily-home" aria-label="Bugünün sade özeti">
    <section className="daily-next surface-card" aria-labelledby="daily-next-title">
      <span className="eyebrow">BUGÜNÜN KÜÇÜK ADIMI</span>
      <span className="daily-next-icon" aria-hidden><AppIcon name={todayEntry ? 'target-arrow' : 'notebook'} /></span>
      <h1 id="daily-next-title">{todayEntry ? 'Bir işine sakin bir alan aç.' : 'Bugünden tek bir cümle bırak.'}</h1>
      <p>{todayEntry ? 'Bir görevi seç ve kısa bir odak oturumuyla ilerlet. Küçük bir çıktı yeter.' : 'Uzun yazman gerekmiyor. Nasıl hissettiğini ve bugün neye özen göstereceğini yaz.'}</p>
      <button className="primary-button" onClick={() => onNavigate(todayEntry ? 'focus' : 'journal')}><AppIcon name="arrow-right" />{todayEntry ? 'Odak oturumu aç' : 'Günlüğümü aç'}</button>
    </section>
    <section className="surface-card daily-resume" aria-labelledby="daily-resume-title">
      <span className="eyebrow">KALDIĞIN YER</span><h2 id="daily-resume-title">{resume.label}</h2><p>{resume.detail}</p>
      <button className="ghost-button" onClick={() => { if (resume.tab) openAppView(resume.view, resume.tab); else onNavigate(resume.view); }}>Devam et <AppIcon name="arrow-right" /></button>
    </section>
    <section className="surface-card daily-progress" aria-labelledby="daily-progress-title">
      <span className="eyebrow">KISA GELİŞİM ÖZETİN</span><h2 id="daily-progress-title">Bu hafta {activeDays} gün kendine alan açtın.</h2>
      <div className="daily-level"><strong>{level.name}</strong><span>{progress}%{nextLevel ? ` · Sıradaki ${nextLevel.name}` : ' · Yolculuğun devam ediyor'}</span></div>
      <progress max={100} value={progress} aria-label={`${level.name} seviye ilerlemesi`} />
      <button className="text-button" aria-expanded={expanded} aria-controls="daily-growth-detail" onClick={() => setExpanded(value => !value)}>{expanded ? 'Detayları gizle' : 'Detayları Gör'} <AppIcon name={expanded ? 'chevron-up' : 'chevron-down'} /></button>
      {expanded && <div id="daily-growth-detail"><GrowthTree xp={journey.xp} trigger={journey.xpOrbTrigger} lastAmount={journey.lastXPAmount} events={events} loading={activity.loading} onNavigate={onNavigate} /><button className="ghost-button" onClick={() => onNavigate('growth')}>Gelişim detaylarım <AppIcon name="arrow-right" /></button></div>}
    </section>
  </div>;
}
