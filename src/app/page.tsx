'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getLevelForXP, DAILY_AYETS, DAILY_HADISLER } from '@/lib/constants';
import { VILLAGE_LOCATIONS, INTERACTION_RADIUS, type VillageLocation } from '@/lib/villageData';
import { playSuccessChime, playClickTone, playTespihTone, playMilestoneTone } from '@/lib/audio';
import Minimap from '@/components/village/Minimap';
import MobileControls from '@/components/village/MobileControls';
import LoginScreen from '@/components/auth/LoginScreen';
import EvimHub from '@/components/hub/EvimHub';
import type { JournalEntry, QuranNote, HadisNote, EisenhowerTask, LessonEntry, SukurEntry } from '@/types';

// Dynamic import 3D Village Canvas (client-only, SSR disabled)
const VillageCanvas = dynamic(() => import('@/components/village/VillageCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#090d16] text-white">
      <div className="w-12 h-12 rounded-2xl bg-indigo-600 animate-spin mb-4" />
      <span className="text-sm font-mono tracking-widest text-indigo-300">KÖY DÜNYASI YÜKLENİYOR...</span>
    </div>
  ),
});

interface Toast { id: number; title: string; msg: string; }

export default function HomePage() {
  const store = useJourneyStore();
  const { isAuthLoading, session } = useAuthStore();

  // ── Auth Gate ────────────────────────────────────────────
  // Supabase'in ilk getSession() çağrısı tamamlanana kadar bekle
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#08091a]">
        <div
          className="w-16 h-16 rounded-3xl mb-6 animate-pulse"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #06b6d4)' }}
        />
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Giriş yapılmamış → Sinematik login ekranı
  if (!session) {
    return <LoginScreen />;
  }

  // Giriş yapılmış → Köy dünyası
  return <VillageWorld />;
}

// ── Köy Dünyası (ayrı bileşen — auth geçildikten sonra mount edilir) ──
function VillageWorld() {
  const store = useJourneyStore();

  // Navigation & World state
  const [playerState, setPlayerState] = useState({ x: 0, y: 0.1, z: 0, heading: 0, speed: 0 });
  const [activeNearbyLocation, setActiveNearbyLocation] = useState<VillageLocation | null>(null);
  const [openModalId, setOpenModalId] = useState<number | null>(null);
  const [showVehicleGarage, setShowVehicleGarage] = useState(false);
  const [showEvimHub, setShowEvimHub] = useState(false);
  const [pendingVehicle, setPendingVehicle] = useState(store.vehicle.type);
  const [classicMode, setClassicMode] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [touchInput, setTouchInput] = useState<{ steer: number; throttle: number }>({ steer: 0, throttle: 0 });
  const [showControlsHint, setShowControlsHint] = useState(true);

  // Daily content & level
  const todayIdx = new Date().getDate() % DAILY_AYETS.length;
  const { level, nextLevel } = getLevelForXP(store.xp);

  // First visit vehicle prompt
  useEffect(() => {
    if (!store.vehicleChosen) {
      setTimeout(() => setShowVehicleGarage(true), 600);
    }
    store.updateStreak();
  }, []);

  // Controls hint auto-fade refs
  const movingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update proximity detector and hint visibility as player moves
  const handlePlayerUpdate = useCallback((x: number, y: number, z: number, heading: number, speed: number) => {
    setPlayerState({ x, y, z, heading, speed });

    // Auto-fade driving hint on movement, restore when idle
    if (Math.abs(speed) > 0.8) {
      if (!movingTimerRef.current) {
        movingTimerRef.current = setTimeout(() => {
          setShowControlsHint(false);
        }, 1800);
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    } else {
      if (movingTimerRef.current) {
        clearTimeout(movingTimerRef.current);
        movingTimerRef.current = null;
      }
      if (!idleTimerRef.current) {
        idleTimerRef.current = setTimeout(() => {
          setShowControlsHint(true);
        }, 2200);
      }
    }

    let closest: VillageLocation | null = null;
    let minDist = INTERACTION_RADIUS;

    for (const loc of VILLAGE_LOCATIONS) {
      if (loc.id === 0) continue; // Plaza
      const dist = Math.hypot(x - loc.x, z - loc.z);
      if (dist <= minDist) {
        minDist = dist;
        closest = loc;
      }
    }

    setActiveNearbyLocation(closest);
  }, []);

  // Keyboard [E] Interaction Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If modal is already open, ignore
      if (openModalId !== null || showVehicleGarage) {
        if (e.key === 'Escape') {
          setOpenModalId(null);
          setShowVehicleGarage(false);
        }
        return;
      }

      if ((e.key === 'e' || e.key === 'E') && activeNearbyLocation) {
        e.preventDefault();
        setOpenModalId(activeNearbyLocation.id);
        playClickTone();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNearbyLocation, openModalId, showVehicleGarage]);

  // Toast notification
  const showToast = useCallback((title: string, msg = '') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // Earn XP helper
  const earnXP = useCallback((amount: number, reason: string) => {
    store.addXP(amount);
    showToast(`+${amount} Amel XP ✨`, reason);
    playSuccessChime();
    store.checkBadges();
  }, [store, showToast]);

  // Form Submissions
  const handleJournalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      mood: Number(fd.get('mood') ?? 3),
      energy: Number(fd.get('energy') ?? 7),
      stress: Number(fd.get('stress') ?? 3),
      content: String(fd.get('content') ?? ''),
      tags: [],
      createdAt: new Date().toISOString(),
    };
    store.addJournal(entry);
    earnXP(25, 'Günün muhasebesi kaydedildi');
    setOpenModalId(null);
    e.currentTarget.reset();
  };

  const handleQuranSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const note: QuranNote = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      sure: String(fd.get('sure') ?? ''),
      ayet: String(fd.get('ayet') ?? ''),
      tefsir: String(fd.get('tefsir') ?? ''),
      ders: String(fd.get('ders') ?? ''),
      createdAt: new Date().toISOString(),
    };
    store.addQuranNote(note);
    earnXP(35, 'Kuran tefekkürü kaydedildi');
    setOpenModalId(null);
    e.currentTarget.reset();
  };

  const handleHadisSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const note: HadisNote = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      metin: String(fd.get('metin') ?? ''),
      kaynak: String(fd.get('kaynak') ?? 'Buhârî'),
      konu: String(fd.get('konu') ?? ''),
      uygulama: String(fd.get('uygulama') ?? ''),
      createdAt: new Date().toISOString(),
    };
    store.addHadisNote(note);
    earnXP(30, 'Hadis dersi kaydedildi');
    setOpenModalId(null);
    e.currentTarget.reset();
  };

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>, qKey: 'q1' | 'q2' | 'q3' | 'q4') => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const task: EisenhowerTask = {
      id: crypto.randomUUID(),
      text: String(fd.get('text') ?? ''),
      done: false,
      createdAt: new Date().toISOString(),
    };
    store.addTask(qKey, task);
    playClickTone();
    e.currentTarget.reset();
  };

  const handleToggleTask = (qKey: 'q1' | 'q2' | 'q3' | 'q4', id: string) => {
    const tasks = store.eisenhower[qKey];
    const task = tasks.find(t => t.id === id);
    store.toggleTask(qKey, id);
    if (task && !task.done) earnXP(25, 'Görev tamamlandı');
  };

  const [severity, setSeverityState] = useState(3);
  const handleLessonSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const entry: LessonEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      title: String(fd.get('title') ?? ''),
      wrong: String(fd.get('wrong') ?? ''),
      learned: String(fd.get('learned') ?? ''),
      severity,
      createdAt: new Date().toISOString(),
    };
    store.addLesson(entry);
    earnXP(25, 'Hata ve ibret dersi kaydedildi');
    setOpenModalId(null);
    e.currentTarget.reset();
  };

  const handleSukurSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const entry: SukurEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      text: String(fd.get('text') ?? ''),
      nimets: [String(fd.get('n1') ?? ''), String(fd.get('n2') ?? ''), String(fd.get('n3') ?? '')],
      createdAt: new Date().toISOString(),
    };
    store.addSukur(entry);
    try {
      const w = window as unknown as { confetti?: (opts: { particleCount: number; spread: number }) => void };
      w.confetti?.({ particleCount: 80, spread: 60 });
    } catch {
      // ignore
    }
    earnXP(20, 'Şükür ve hamd kaydedildi');
    setOpenModalId(null);
    e.currentTarget.reset();
  };

  const [zikirType, setZikirType] = useState('Subhanallah');
  const tespihTarget = 33;
  const handleTespih = () => {
    store.incrementTespih();
    playTespihTone(store.currentTespih);
    if ((store.currentTespih + 1) >= tespihTarget) {
      earnXP(30, `${zikirType} ${tespihTarget} adet tamamlandı!`);
      store.resetTespih();
      playMilestoneTone();
    }
  };

  const exportData = () => {
    const data = store.exportAll();
    const str = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.href = str;
    a.download = `SAH_Koy_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Yedek İndirildi', 'Verileriniz JSON olarak kaydedildi.');
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        store.importAll(parsed);
        showToast('Yedek Geri Yüklendi!', 'Tüm verileriniz güncellendi.');
      } catch { alert('Geçersiz dosya!'); }
    };
    reader.readAsText(file);
  };

  const isInputBlocked = openModalId !== null || showVehicleGarage;

  return (
    <div className="relative min-h-screen bg-[#090d16] text-slate-100 selection:bg-indigo-500 selection:text-white overflow-hidden select-none">

      {/* ============ TOP GAME HUD (Minimal Bruno Simon Floating Islands) ============ */}
      <header className="fixed top-4 left-4 right-4 min-h-[3rem] z-[1000] flex items-start md:items-center justify-between pointer-events-none">
        
        {/* Left Status Island */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 pointer-events-auto max-w-[70%] md:max-w-none">
          {/* Brand Emblem */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-pill border-white/10 shadow-lg flex-shrink-0">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center text-white font-black text-xs shadow-md">
              S
            </div>
            <span className="text-xs font-black tracking-wider bg-gradient-to-r from-white via-indigo-100 to-cyan-300 bg-clip-text text-transparent">
              SAH WORLD
            </span>
          </div>

          {/* Vehicle Quick Switch Pill */}
          <button
            onClick={() => setShowVehicleGarage(true)}
            title="Binek Değiştir"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-pill border-indigo-500/25 hover:border-indigo-400 text-indigo-200 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="text-sm">{store.vehicle.icon}</span>
            <span className="text-[11px] font-medium">{store.vehicle.name}</span>
          </button>

          {/* Streak Indicator Pill */}
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full glass-pill border-amber-500/25 text-amber-300 text-xs font-bold font-mono shadow-sm flex-shrink-0">
            🔥 {store.streak.current}
          </div>

          {/* XP & Level Indicator Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-pill border-emerald-500/25 text-emerald-300 text-xs font-bold font-mono shadow-sm">
            <span>✨ {store.xp} XP</span>
            <span className="text-slate-500 text-[10px]">·</span>
            <span>{level.icon} {level.name}</span>
          </div>
        </div>

        {/* Right Actions Island */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowEvimHub(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all border border-indigo-400/40 cursor-pointer"
          >
            <span>🏠</span>
            <span className="hidden sm:inline">Evim</span>
          </button>

          <button
            onClick={() => setClassicMode(m => !m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold glass-pill transition-all cursor-pointer ${
              classicMode
                ? 'bg-indigo-600/30 border-indigo-400/40 text-indigo-200'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>{classicMode ? '📋' : '🌐'}</span>
            <span className="hidden sm:inline">{classicMode ? 'Liste' : '3D Köy'}</span>
          </button>

          <button
            onClick={exportData}
            title="Verileri Yedekle (JSON)"
            className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            💾
          </button>

          <label
            title="Yedekten Geri Yükle"
            className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            📂
            <input type="file" accept=".json" className="hidden" onChange={importData} />
          </label>
        </div>
      </header>

      {/* ============ 3D VILLAGE CANVAS ============ */}
      {!classicMode && (
        <div className="fixed inset-0 z-[1]">
          <VillageCanvas
            vehicleType={store.vehicle.type}
            activeBuildingId={activeNearbyLocation?.id ?? null}
            xp={store.xp}
            isInputBlocked={isInputBlocked}
            touchInput={touchInput}
            onPlayerUpdate={handlePlayerUpdate}
          />
        </div>
      )}

      {/* ============ DESKTOP DRIVING GUIDE HINT (Smooth opacity fade on movement) ============ */}
      {!classicMode && !activeNearbyLocation && openModalId === null && !showEvimHub && (
        <div
          className="fixed bottom-6 left-6 z-[900] glass-pill rounded-full px-4 py-2 hidden md:flex items-center gap-2.5 text-[11px] text-slate-300 border border-white/10 shadow-xl pointer-events-none"
          style={{
            opacity: showControlsHint ? 1 : 0,
            transition: 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="flex items-center gap-1 font-mono font-bold text-cyan-300">
            {['W', 'A', 'S', 'D'].map(k => (
              <span key={k} className="px-1.5 py-0.5 rounded bg-slate-800/90 border border-white/15">{k}</span>
            ))}
          </div>
          <span className="text-slate-500">·</span>
          <span className="font-mono font-semibold text-cyan-300">Ok Tuşları</span>
          <span className="text-slate-400">ile sürüş</span>
          <span className="text-slate-600 mx-1">|</span>
          <span className="font-mono font-semibold text-amber-300/80">[E]</span>
          <span className="text-slate-400">binalara gir</span>
        </div>
      )}

      {/* ============ FLOATING PROXIMITY INTERACTION CHIP ============ */}
      {!classicMode && activeNearbyLocation && openModalId === null && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1500] animate-bounce">
          <button
            onClick={() => {
              setOpenModalId(activeNearbyLocation.id);
              playClickTone();
            }}
            className="flex items-center gap-3.5 px-6 py-3 rounded-full glass-panel border shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-2xl"
            style={{
              borderColor: activeNearbyLocation.color,
              boxShadow: `0 0 30px ${activeNearbyLocation.color}40`,
            }}
          >
            <span className="w-7 h-7 rounded-full bg-white/20 text-white font-mono font-black text-xs flex items-center justify-center border border-white/30 shadow-inner">
              E
            </span>
            <span className="text-xl">{activeNearbyLocation.icon}</span>
            <div className="text-left">
              <div className="text-xs font-black text-white">{activeNearbyLocation.label}</div>
              <div className="text-[10px] text-slate-300">Girmek için [E]&apos;ye veya buraya tıkla</div>
            </div>
          </button>
        </div>
      )}

      {/* ============ INTERACTIVE MINIMAP & COMPASS ============ */}
      {!classicMode && (
        <div className="fixed bottom-6 right-6 z-[900]">
          <Minimap
            playerX={playerState.x}
            playerZ={playerState.z}
            playerHeading={playerState.heading}
            activeBuildingId={activeNearbyLocation?.id ?? null}
            onSelectLocation={(loc) => {
              setOpenModalId(loc.id);
              playClickTone();
            }}
          />
        </div>
      )}

      {/* ============ MOBILE TOUCH CONTROLS ============ */}
      {!classicMode && !isInputBlocked && (
        <MobileControls onInputChange={setTouchInput} />
      )}

      {/* ============ SECTION MODALS / DOCKED PANELS ============ */}
      {openModalId !== null && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xl z-[20000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="glass-panel rounded-3xl max-w-[720px] w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative border border-white/20">
            {/* Modal Header */}
            {(() => {
              const loc = VILLAGE_LOCATIONS.find(l => l.id === openModalId);
              if (!loc) return null;
              return (
                <div className="flex items-center justify-between mb-7 border-b border-white/10 pb-5">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{loc.icon}</span>
                    <div>
                      <h2 className="text-2xl font-black text-white">{loc.label}</h2>
                      <p className="text-sm text-slate-400 mt-0.5">{loc.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenModalId(null)}
                    className="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 transition-all text-base cursor-pointer flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              );
            })()}

            {/* Modal Contents */}
            {openModalId === 1 && <GunlukPanelContent onSubmit={handleJournalSubmit} entries={store.journal.slice(0, 4)} />}
            {openModalId === 2 && <KuranPanelContent onSubmit={handleQuranSubmit} entries={store.quranNotes.slice(0, 4)} />}
            {openModalId === 3 && <HadisPanelContent onSubmit={handleHadisSubmit} entries={store.hadisNotes.slice(0, 4)} />}
            {openModalId === 4 && <MatrisPanelContent eisenhower={store.eisenhower} onAddTask={handleAddTask} onToggle={handleToggleTask} />}
            {openModalId === 5 && <HatalarPanelContent onSubmit={handleLessonSubmit} severity={severity} onSeverityChange={setSeverityState} entries={store.lessons.slice(0, 4)} />}
            {openModalId === 6 && <SukurPanelContent onSubmit={handleSukurSubmit} entries={store.sukurList.slice(0, 4)} />}
            {openModalId === 7 && <MescidimPanelContent tespihCount={store.currentTespih} totalZikir={store.totalZikir} onTespih={handleTespih} zikirType={zikirType} onZikirChange={setZikirType} onReset={store.resetTespih} dailyAyet={DAILY_AYETS[todayIdx]} dailyHadis={DAILY_HADISLER[todayIdx]} />}
            {openModalId === 8 && (
              <div className="text-center space-y-6">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 font-bold text-xs uppercase tracking-wider">
                  👑 Ebedi Hazine & Mükâfat
                </span>
                <h3 className="text-3xl font-black text-amber-400">Ahiret Deposu</h3>
                <p className="text-slate-300 text-sm max-w-md mx-auto">
                  Köyde attığın her samimi adım ve kaydettiğin her amel bu ebedi hazinede birikir.
                </p>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="glass-card rounded-2xl p-4">
                    <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">AMEL PUANI</div>
                    <div className="text-2xl font-black font-mono text-indigo-400">{store.xp}</div>
                  </div>
                  <div className="glass-card rounded-2xl p-4">
                    <div className="text-[10px] text-amber-400 uppercase font-mono mb-1">MERTEBE</div>
                    <div className="text-xl font-black text-amber-300">{level.icon} {level.name}</div>
                  </div>
                  <div className="glass-card rounded-2xl p-4">
                    <div className="text-[10px] text-emerald-400 uppercase font-mono mb-1">TOPLAM ZİKİR</div>
                    <div className="text-2xl font-black font-mono text-emerald-400">{store.totalZikir}</div>
                  </div>
                </div>

                {/* Badges Grid */}
                <div className="text-left">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Manevi Nişanlar</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {['first_step','week_warrior','sukur_master','zikir_master','kuran_dostu','eisen_master','hadis_alimi','ders_ustası'].map(id => {
                      const earned = store.badges.includes(id);
                      return (
                        <div
                          key={id}
                          className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                            earned ? 'bg-amber-950/40 border-amber-500/40 opacity-100 shadow-sm' : 'bg-slate-900/40 border-white/5 opacity-30 grayscale'
                          }`}
                        >
                          <div className="text-xl mb-0.5">{earned ? '🏆' : '🔒'}</div>
                          <div className="font-bold text-slate-200 text-[10px] truncate">{id.replace(/_/g, ' ')}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ VEHICLE GARAGE MODAL ============ */}
      {showVehicleGarage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[20000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="glass-panel rounded-3xl max-w-[820px] w-full p-9 text-center border border-white/20">
            <span className="inline-flex items-center gap-2 px-4 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-bold uppercase mb-4">
              🚗 Manevi Binek Seçimi
            </span>
            <h2 className="text-3xl font-black mb-2 text-white">Hangi Araçla Köyü Keşfedeceksin?</h2>
            <p className="text-slate-400 mb-8 text-sm">Köy yollarında sana eşlik edecek biniti seç.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {(['car','bike','horse','rocket'] as const).map(type => {
                const defs = {
                  car: { icon: '🚗', name: 'Otomobil', desc: 'Dengeli & konforlu' },
                  bike: { icon: '🚲', name: 'Bisiklet', desc: 'Hafif & manevralı' },
                  horse: { icon: '🐎', name: 'Atlı', desc: 'Kadim & asil' },
                  rocket: { icon: '🚀', name: 'Roket', desc: 'Süratli & yüksek idealli' },
                };
                const d = defs[type];
                const isSelected = pendingVehicle === type;
                return (
                  <button
                    key={type}
                    onClick={() => setPendingVehicle(type)}
                    className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-600/30 shadow-lg shadow-indigo-500/25 scale-105'
                        : 'border-white/10 bg-slate-900/60 hover:border-indigo-400/40'
                    }`}
                  >
                    <div className="text-5xl my-1">{d.icon}</div>
                    <div className="font-black text-white text-base">{d.name}</div>
                    <div className="text-xs text-slate-400">{d.desc}</div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                const defs = {
                  car: { type: 'car' as const, name: 'Otomobil', icon: '🚗', flavorText: '', color: '#6366f1' },
                  bike: { type: 'bike' as const, name: 'Bisiklet', icon: '🚲', flavorText: '', color: '#10b981' },
                  horse: { type: 'horse' as const, name: 'Atlı', icon: '🐎', flavorText: '', color: '#d97706' },
                  rocket: { type: 'rocket' as const, name: 'Roket', icon: '🚀', flavorText: '', color: '#ef4444' },
                };
                store.setVehicle(defs[pendingVehicle]);
                setShowVehicleGarage(false);
                playSuccessChime();
              }}
              className="px-10 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all text-base cursor-pointer"
            >
              ✅ Bu Araçla Köyü Keşfet
            </button>
          </div>
        </div>
      )}

      {/* ============ TOAST NOTIFICATIONS ============ */}
      <div className="fixed bottom-20 left-7 z-[10000] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="glass-panel border-l-4 border-l-cyan-400 rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3 min-w-[280px] max-w-sm animate-in slide-in-from-left-5 duration-300"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-lg flex-shrink-0">
              ✨
            </div>
            <div>
              <div className="text-sm font-bold text-white">{t.title}</div>
              {t.msg && <div className="text-xs text-slate-300 mt-0.5">{t.msg}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ============ EVIM HUB OVERLAY ============ */}
      {showEvimHub && <EvimHub onClose={() => setShowEvimHub(false)} />}
    </div>
  );
}

// ============================================================
// INLINE PANEL FORMS
// ============================================================

interface GunlukProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  entries: JournalEntry[];
}

function GunlukPanelContent({ onSubmit, entries }: GunlukProps) {
  const [mood, setMood] = useState(3);
  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-5">
        <input type="hidden" name="mood" value={mood} />
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">Günün Ruh Hali</label>
          <div className="flex gap-3">
            {[[1,'😭','Kötü'],[2,'🙁','Düşük'],[3,'😐','Normal'],[4,'🙂','İyi'],[5,'🤩','Harika']].map(([v,e,l]) => (
              <button
                type="button"
                key={v}
                onClick={() => setMood(Number(v))}
                className={`flex-1 py-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  mood === Number(v)
                    ? 'border-indigo-400 bg-indigo-600/30 text-white shadow-md'
                    : 'border-white/10 bg-slate-900/60 text-slate-400 hover:border-indigo-400/40'
                }`}
              >
                <span className="text-2xl">{e}</span>
                <span className="text-xs font-semibold">{l}</span>
              </button>
            ))}
          </div>
        </div>

        <textarea
          name="content"
          required
          placeholder="Bugünün hisleri, tefekkürleri ve manevi notları..."
          className="w-full px-4 py-3 glass-input rounded-xl text-sm resize-none h-28 placeholder:text-slate-500"
        />

        <button
          type="submit"
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all text-sm cursor-pointer"
        >
          💾 Kaydet (+50 XP)
        </button>
      </form>

      {entries.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Son Seyir Notları</h4>
          {entries.map((e: JournalEntry) => (
            <div key={e.id} className="p-3 glass-card rounded-xl border-l-4 border-l-indigo-500 text-sm">
              <span className="font-bold text-indigo-300">{e.date}</span> · Ruh Hali {e.mood}/5
              <p className="text-slate-300 text-xs mt-1 line-clamp-2">{e.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface KuranProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  entries: QuranNote[];
}

function KuranPanelContent({ onSubmit, entries }: KuranProps) {
  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input
            name="sure"
            required
            placeholder="Sure adı (Örn: Bakara)"
            className="px-4 py-3 glass-input rounded-xl text-sm placeholder:text-slate-500"
          />
          <input
            name="ayet"
            required
            placeholder="Ayet no (Örn: 152)"
            className="px-4 py-3 glass-input rounded-xl text-sm placeholder:text-slate-500"
          />
        </div>
        <textarea
          name="tefsir"
          required
          placeholder="Ayetin meali & tefsiri..."
          className="w-full px-4 py-3 glass-input rounded-xl text-sm resize-none h-24 placeholder:text-slate-500"
        />
        <textarea
          name="ders"
          placeholder="Hayatıma çıkarılan temel ders..."
          className="w-full px-4 py-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-sm text-amber-200 resize-none h-20 placeholder:text-amber-400/50 focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 font-bold rounded-xl shadow-lg hover:shadow-amber-500/30 transition-all text-sm cursor-pointer"
        >
          📖 Kaydet (+60 XP)
        </button>
      </form>

      {entries.length > 0 && (
        <div className="mt-4 space-y-2">
          {entries.map((n: QuranNote) => (
            <div key={n.id} className="p-3 glass-card rounded-xl text-sm border-l-4 border-l-amber-500">
              <strong className="text-amber-300">{n.sure} Suresi, {n.ayet}. Ayet</strong>
              <p className="text-slate-300 text-xs mt-1 line-clamp-2">{n.tefsir}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface HadisProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  entries: HadisNote[];
}

function HadisPanelContent({ onSubmit, entries }: HadisProps) {
  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <textarea
          name="metin"
          required
          placeholder="Hadis metni..."
          className="w-full px-4 py-3 glass-input rounded-xl text-sm resize-none h-24 placeholder:text-slate-500"
        />
        <div className="grid grid-cols-2 gap-4">
          <select
            name="kaynak"
            className="px-4 py-3 glass-input rounded-xl text-sm text-slate-200 focus:outline-none"
          >
            {['Buhârî','Müslim','Tirmizî','Ebû Dâvûd','Riyazü\'s-Salihin'].map(k => <option key={k} value={k} className="bg-slate-900 text-white">{k}</option>)}
          </select>
          <input
            name="konu"
            required
            placeholder="Konu (Örn: İhlas)"
            className="px-4 py-3 glass-input rounded-xl text-sm placeholder:text-slate-500"
          />
        </div>
        <textarea
          name="uygulama"
          required
          placeholder="Hayatıma uygulaması..."
          className="w-full px-4 py-3 glass-input rounded-xl text-sm resize-none h-20 placeholder:text-slate-500"
        />
        <button
          type="submit"
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all text-sm cursor-pointer"
        >
          🕌 Kaydet (+60 XP)
        </button>
      </form>

      {entries.length > 0 && (
        <div className="mt-4 space-y-2">
          {entries.map((n: HadisNote) => (
            <div key={n.id} className="p-3 glass-card rounded-xl text-sm border-l-4 border-l-emerald-500">
              <strong className="text-emerald-300">{n.konu} ({n.kaynak})</strong>
              <p className="text-slate-300 text-xs mt-1 italic line-clamp-2">&quot;{n.metin}&quot;</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface MatrisProps {
  eisenhower: { q1: EisenhowerTask[]; q2: EisenhowerTask[]; q3: EisenhowerTask[]; q4: EisenhowerTask[] };
  onAddTask: (e: React.FormEvent<HTMLFormElement>, qKey: 'q1' | 'q2' | 'q3' | 'q4') => void;
  onToggle: (qKey: 'q1' | 'q2' | 'q3' | 'q4', id: string) => void;
}

function MatrisPanelContent({ eisenhower, onAddTask, onToggle }: MatrisProps) {
  const quadrants: Array<{ key: 'q1' | 'q2' | 'q3' | 'q4'; label: string; color: string; cls: string }> = [
    { key: 'q1', label: '🔴 ACİL + ÖNEMLİ', color: '#f87171', cls: 'border-red-500/60' },
    { key: 'q2', label: '🟡 ÖNEMLİ', color: '#fbbf24', cls: 'border-amber-500/60' },
    { key: 'q3', label: '🔵 ACİL', color: '#60a5fa', cls: 'border-blue-500/60' },
    { key: 'q4', label: '⚪ DİĞER', color: '#94a3b8', cls: 'border-slate-500/60' },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        {quadrants.map(q => (
          <div key={q.key} className={`glass-card rounded-2xl p-5 border-t-2 ${q.cls}`}>
            {/* Quadrant label — clear section header, not cramped tiny text */}
            <div
              className="text-[13px] font-semibold tracking-wide mb-4"
              style={{ color: q.color }}
            >
              {q.label}
            </div>

            {/* Add task form — input and button have proper gap, button never cut off */}
            <form onSubmit={e => onAddTask(e, q.key)} className="flex gap-2.5 mb-4">
              <input
                name="text"
                required
                placeholder="Görev ekle..."
                className="flex-1 min-w-0 px-3.5 py-2.5 text-sm glass-input rounded-xl placeholder:text-slate-500"
                style={{ height: '40px' }}
              />
              <button
                type="submit"
                className="w-10 h-10 flex-shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-lg font-bold flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md"
              >
                +
              </button>
            </form>

            {/* Task list */}
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {eisenhower[q.key].map((t: EisenhowerTask) => (
                <div
                  key={t.id}
                  onClick={() => onToggle(q.key, t.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-xs border transition-all ${
                    t.done
                      ? 'bg-slate-900/40 border-white/5 line-through opacity-40 text-slate-500'
                      : 'bg-slate-900/80 border-white/10 hover:border-indigo-400/40 text-slate-200'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center border flex-shrink-0 text-[10px] ${
                    t.done ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-500'
                  }`}>
                    {t.done ? '✓' : ''}
                  </div>
                  <span className="truncate">{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface HatalarProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  severity: number;
  onSeverityChange: (v: number) => void;
  entries: LessonEntry[];
}

function HatalarPanelContent({ onSubmit, severity, onSeverityChange, entries }: HatalarProps) {
  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          name="title"
          required
          placeholder="Olay & konu (Örn: Erteleme alışkanlığı)"
          className="w-full px-4 py-3 glass-input rounded-xl text-sm placeholder:text-slate-500"
        />
        <div>
          <label className="text-sm font-semibold text-slate-300 block mb-2.5">Şiddet Derecesi</label>
          <div className="flex gap-3">
            {[1,2,3,4,5].map(v => (
              <button
                type="button"
                key={v}
                onClick={() => onSeverityChange(v)}
                className={`text-3xl transition-all cursor-pointer ${v <= severity ? 'text-rose-500' : 'text-slate-700'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <textarea
          name="wrong"
          required
          placeholder="Ne yanlış gitti?"
          className="w-full px-4 py-3 glass-input rounded-xl text-sm resize-none h-20 placeholder:text-slate-500"
        />
        <textarea
          name="learned"
          required
          placeholder="Çıkarılan ders & aksiyon planı..."
          className="w-full px-4 py-3 glass-input rounded-xl text-sm resize-none h-20 placeholder:text-slate-500"
        />
        <button
          type="submit"
          className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-500 text-white font-bold rounded-xl shadow-lg hover:shadow-rose-500/30 transition-all text-sm cursor-pointer"
        >
          🛡️ Kaydet (+40 XP)
        </button>
      </form>

      {entries.length > 0 && (
        <div className="mt-4 space-y-2">
          {entries.map((l: LessonEntry) => (
            <div key={l.id} className="p-3 glass-card rounded-xl text-sm border-l-4 border-l-rose-500">
              <strong className="text-rose-300">{l.title}</strong>
              <p className="text-slate-400 text-xs mt-1 line-clamp-2">Ders: {l.learned}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SukurProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  entries: SukurEntry[];
}

function SukurPanelContent({ onSubmit, entries }: SukurProps) {
  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <textarea
          name="text"
          required
          placeholder="Bugün neye samimiyetle şükredeceksin?"
          className="w-full px-4 py-3 glass-input rounded-xl text-sm resize-none h-24 placeholder:text-slate-500"
        />
        <div className="grid grid-cols-3 gap-4">
          <input name="n1" required placeholder="1. Nimet" className="px-3.5 py-3 glass-input rounded-xl text-sm placeholder:text-slate-500" />
          <input name="n2" required placeholder="2. Nimet" className="px-3.5 py-3 glass-input rounded-xl text-sm placeholder:text-slate-500" />
          <input name="n3" required placeholder="3. Nimet" className="px-3.5 py-3 glass-input rounded-xl text-sm placeholder:text-slate-500" />
        </div>
        <button
          type="submit"
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all text-sm cursor-pointer"
        >
          ✨ Kaydet (+35 XP)
        </button>
      </form>

      {entries.length > 0 && (
        <div className="mt-4 space-y-2">
          {entries.map((s: SukurEntry) => (
            <div key={s.id} className="p-3 glass-card rounded-xl text-xs border-l-4 border-l-emerald-500 text-slate-300">
              &quot;{s.text.slice(0, 90)}...&quot;
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface MescidimProps {
  tespihCount: number;
  totalZikir: number;
  onTespih: () => void;
  zikirType: string;
  onZikirChange: (z: string) => void;
  onReset: () => void;
  dailyAyet: { arabic: string; turkish: string };
  dailyHadis: string;
}

function MescidimPanelContent({
  tespihCount,
  totalZikir,
  onTespih,
  zikirType,
  onZikirChange,
  onReset,
  dailyAyet,
  dailyHadis,
}: MescidimProps) {
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-5 text-center">
        <div className="text-xs font-bold text-emerald-400 mb-3 tracking-wide">{zikirType}</div>
        <button
          onClick={onTespih}
          className="w-28 h-28 rounded-full border-4 border-emerald-500 bg-slate-900 text-emerald-400 flex flex-col items-center justify-center mx-auto shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <span className="text-4xl font-black font-mono leading-none">{tespihCount}</span>
          <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Hedef: 33</span>
        </button>

        <div className="flex gap-2 justify-center mt-4">
          <select
            value={zikirType}
            onChange={e => { onZikirChange(e.target.value); onReset(); }}
            className="p-2 text-xs glass-input rounded-xl text-slate-200 font-semibold"
          >
            {['Subhanallah','Elhamdulillah','Allahu Ekber','La ilahe illallah','Astagfirullah'].map(z => (
              <option key={z} value={z} className="bg-slate-900 text-white">{z}</option>
            ))}
          </select>
          <button
            onClick={onReset}
            className="px-3 py-2 bg-slate-800/80 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-700 cursor-pointer"
          >
            ↺ Sıfırla
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 font-mono">Toplam: {totalZikir} zikir</p>
      </div>

      <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs">
        <div className="font-bold text-amber-400 mb-1">GÜNÜN AYETİ</div>
        <p className="text-slate-200 italic">{dailyAyet.turkish}</p>
      </div>

      <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs">
        <div className="font-bold text-emerald-400 mb-1">GÜNÜN HADİSİ</div>
        <p className="text-slate-200 italic">{dailyHadis}</p>
      </div>
    </div>
  );
}
