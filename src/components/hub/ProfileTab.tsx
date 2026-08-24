'use client';
/* eslint-disable @next/next/no-img-element */

import { useAuthStore } from '@/store/useAuthStore';
import { useJourneyStore } from '@/store/useJourneyStore';
import { getLevelForXP } from '@/lib/constants';

export default function ProfileTab() {
  const { profile } = useAuthStore();
  const store = useJourneyStore();

  if (!profile) return null;

  const { level, nextLevel } = getLevelForXP(profile.xp);
  const currentLevelXP = level.xp;
  const nextLevelXP = nextLevel?.xp || profile.xp + 1;
  const progressPercent = Math.min(100, (profile.xp - currentLevelXP) / ((nextLevelXP - currentLevelXP) || 1) * 100);

  // Activity calculation (Last 7 days)
  const getRecentActivity = () => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      let count = 0;
      count += store.journal.filter(x => x.date === dateStr).length;
      count += store.quranNotes.filter(x => x.date === dateStr).length;
      count += store.hadisNotes.filter(x => x.date === dateStr).length;
      count += store.sukurList.filter(x => x.date === dateStr).length;
      
      days.push({
        date: dateStr,
        dayName: d.toLocaleDateString('tr-TR', { weekday: 'short' }),
        count
      });
    }
    return days;
  };

  const activity = getRecentActivity();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in select-none">
      
      {/* ============ HERO PROFILE CARD ============ */}
      <div className="sah-modal-shell p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        {/* Soft Ambient Aurora Light */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        {/* Hero Avatar with Radial Glow */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 blur-lg opacity-70 animate-pulse" />
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full ring-4 ring-indigo-400/30 bg-slate-950 overflow-hidden relative z-10 shadow-2xl">
            <img 
              src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.display_name}`} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Hero Info */}
        <div className="flex-1 text-center md:text-left relative z-10 w-full">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-wide mb-2">
            {profile.display_name}
          </h2>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-6">
            <span className="glass-pill px-3 py-1 rounded-full text-indigo-300 text-xs font-bold flex items-center gap-2 border-indigo-500/30">
              <span>{level.icon}</span> {level.name}
            </span>
            <span className="glass-pill px-3 py-1 rounded-full text-amber-300 text-xs font-bold font-mono flex items-center gap-1 border-amber-500/30">
              🔥 {profile.streak_current} Gün Seri
            </span>
          </div>

          {/* XP Progress Bar */}
          <div className="xp-progress-stack w-full pt-1">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs text-slate-300 font-mono font-semibold leading-none">
              <span className="justify-self-start whitespace-nowrap">{currentLevelXP} XH</span>
              <span className="justify-self-center text-cyan-300 font-bold px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 whitespace-nowrap">{Math.round(progressPercent)}%</span>
              <span className="justify-self-end whitespace-nowrap">{nextLevelXP} XH</span>
            </div>
            <div className="w-full h-3 bg-slate-900/90 rounded-full overflow-hidden p-1 relative shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-1000 shadow-sm"
                style={{ width: `${Math.max(2, progressPercent)}%` }}
              />
            </div>
            <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono">
              <span>Seviye İlerlemesi</span>
              <span>Toplam Amel: <strong className="text-white font-bold">{profile.xp} XH</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ STATS & ACTIVITY GRID ============ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Aktivite Isı Grafiği */}
        <div className="sah-card p-6 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2 tracking-wide uppercase">
            <span>📈</span> Son 7 Gün Aktivitesi
          </h3>
          
          {activity.every(a => a.count === 0) ? (
            <div className="sah-empty-state h-32 min-h-0 p-4">
              <span className="text-2xl mb-1 opacity-60">🌱</span>
              <p className="text-xs font-semibold text-slate-400">Henüz son 7 güne ait amel kaydı yok</p>
              <p className="text-[10px] text-slate-500 mt-1">Köydeki binalardan günlük, zikir veya tefekkür ekleyin.</p>
            </div>
          ) : (
            <div className="flex items-stretch h-36 gap-3 px-2 pt-6">
              {activity.map((day, i) => {
                const maxCount = Math.max(...activity.map(a => a.count), 1);
                const height = day.count === 0 ? 8 : Math.max(16, (day.count / maxCount) * 100);
                const isEmpty = day.count === 0;

                return (
                  <div key={i} className="flex-1 min-w-0 h-full flex flex-col items-center gap-2 group">
                    <div className="w-full flex-1 min-h-0 relative flex items-end justify-center">
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          isEmpty
                            ? 'bg-white/[0.06]'
                            : 'bg-gradient-to-t from-indigo-600 via-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/25'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                      
                      {/* Tooltip on Hover */}
                      <div className="absolute -top-9 bg-slate-900/90 text-white text-[11px] font-mono px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl backdrop-blur-md">
                        {day.count} Amel
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono uppercase font-semibold ${isEmpty ? 'text-slate-500' : 'text-indigo-300'}`}>{day.dayName}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Celebratory Stats Cards */}
        <div className="sah-card p-6 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-200 mb-6 flex items-center gap-2 tracking-wide uppercase">
            <span>📊</span> Amel İstatistikleri
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Toplam Zikir" value={profile.total_zikir.toString()} icon="📿" color="#6366f1" />
            <StatCard label="Günlük Kayıt" value={store.journal.length.toString()} icon="📖" color="#38bdf8" />
            <StatCard label="Şükür Listesi" value={store.sukurList.length.toString()} icon="💖" color="#ec4899" />
            <StatCard label="Manevi Rozet" value={profile.badges.length.toString()} icon="🏅" color="#f59e0b" />
          </div>
        </div>
      </div>

    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="sah-card p-4 flex flex-col items-center justify-center text-center hover:-translate-y-0.5 transition-all cursor-default">
      <span className="text-2xl mb-2" style={{ color }}>{icon}</span>
      <span className="text-2xl md:text-3xl font-black text-white font-mono tracking-tight">{value}</span>
      <span className="text-[11px] font-semibold text-slate-400 mt-1">{label}</span>
    </div>
  );
}
