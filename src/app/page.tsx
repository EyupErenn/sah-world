'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useJourneyStore } from '@/store/useJourneyStore';
import { STATIONS, STATION_PROXIMITY, getLevelForXP, DAILY_AYETS, DAILY_HADISLER } from '@/lib/constants';
import { playSuccessChime, playClickTone, playTespihTone, playMilestoneTone } from '@/lib/audio';
import type { JourneyCanvasHandle } from '@/components/journey/JourneyCanvas';
import type { JournalEntry, QuranNote, HadisNote, EisenhowerTask, LessonEntry, SukurEntry } from '@/types';

// Dynamic import 3D canvas (client-only, SSR disabled)
const JourneyCanvas = dynamic(() => import('@/components/journey/JourneyCanvas'), {
  ssr: false,
  loading: () => null,
});

gsap.registerPlugin(ScrollTrigger);

// ============================================================
// Helper: toast notification state
// ============================================================
interface Toast { id: number; title: string; msg: string; }

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function HomePage() {
  const store = useJourneyStore();
  const canvasRef = useRef<JourneyCanvasHandle>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStationId, setActiveStationId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [classicMode, setClassicMode] = useState(false);
  const [showVehicleGarage, setShowVehicleGarage] = useState(false);
  const [pendingVehicle, setPendingVehicle] = useState(store.vehicle.type);

  // Daily rotating content
  const todayIdx = new Date().getDate() % DAILY_AYETS.length;

  // XP / level info
  const { level, nextLevel } = getLevelForXP(store.xp);

  // Show vehicle garage on first visit
  useEffect(() => {
    if (!store.vehicleChosen) {
      setTimeout(() => setShowVehicleGarage(true), 600);
    }
    store.updateStreak();
  }, []);

  // ============================================================
  // GSAP ScrollTrigger
  // ============================================================
  useEffect(() => {
    if (classicMode) return;
    const scrollTrack = document.getElementById('journey-scroll-track');
    if (!scrollTrack) return;

    const st = ScrollTrigger.create({
      trigger: scrollTrack,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        const p = self.progress;
        setScrollProgress(p);
        canvasRef.current?.setProgress(p);

        // Evaluate station proximity
        let matched: number | null = null;
        for (const st of STATIONS) {
          if (Math.abs(p - st.progress) <= STATION_PROXIMITY) {
            matched = st.id;
            break;
          }
        }
        setActiveStationId(matched);
      },
    });

    return () => st.kill();
  }, [classicMode]);

  // ============================================================
  // TOAST
  // ============================================================
  const showToast = useCallback((title: string, msg = '') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ============================================================
  // XP WRAPPER (hooks into store.addXP + shows toast + triggers orb)
  // ============================================================
  const earnXP = useCallback((amount: number, reason: string) => {
    store.addXP(amount);
    showToast(`+${amount} Amel XP ✨`, reason);
    playSuccessChime();
    store.checkBadges();
  }, [store, showToast]);

  // ============================================================
  // JUMP TO STATION
  // ============================================================
  const jumpToStation = useCallback((id: number) => {
    const target = STATIONS.find(s => s.id === id);
    if (!target) return;
    const track = document.getElementById('journey-scroll-track');
    if (!track) return;
    const maxScroll = track.offsetHeight - window.innerHeight;
    window.scrollTo({ top: target.progress * maxScroll, behavior: 'smooth' });
    playClickTone();
  }, []);

  // ============================================================
  // FORM HANDLERS
  // ============================================================

  // Günlük
  const handleJournalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const entry: JournalEntry = {
      id: 'j_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      mood: Number(fd.get('mood') ?? 3),
      energy: Number(fd.get('energy') ?? 7),
      stress: Number(fd.get('stress') ?? 3),
      content: String(fd.get('content') ?? ''),
      tags: [],
      createdAt: new Date().toISOString(),
    };
    store.addJournal(entry);
    earnXP(50, 'Günlük Seyir Defteri kaydedildi');
    e.currentTarget.reset();
  };

  // Kuran
  const handleQuranSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const note: QuranNote = {
      id: 'q_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      sure: String(fd.get('sure') ?? ''),
      ayet: String(fd.get('ayet') ?? ''),
      tefsir: String(fd.get('tefsir') ?? ''),
      ders: String(fd.get('ders') ?? ''),
      createdAt: new Date().toISOString(),
    };
    store.addQuranNote(note);
    earnXP(60, `${note.sure} Suresi notu kaydedildi`);
    e.currentTarget.reset();
  };

  // Hadis
  const handleHadisSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const note: HadisNote = {
      id: 'h_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      metin: String(fd.get('metin') ?? ''),
      kaynak: String(fd.get('kaynak') ?? 'Buhârî'),
      konu: String(fd.get('konu') ?? ''),
      uygulama: String(fd.get('uygulama') ?? ''),
      createdAt: new Date().toISOString(),
    };
    store.addHadisNote(note);
    earnXP(60, `${note.konu} Hadisi kaydedildi`);
    e.currentTarget.reset();
  };

  // Eisenhower task
  const handleAddTask = (e: React.FormEvent<HTMLFormElement>, qKey: 'q1' | 'q2' | 'q3' | 'q4') => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const task: EisenhowerTask = {
      id: 't_' + Date.now(),
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

  // Lesson
  const [severity, setSeverityState] = useState(3);
  const handleLessonSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const entry: LessonEntry = {
      id: 'l_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      title: String(fd.get('title') ?? ''),
      wrong: String(fd.get('wrong') ?? ''),
      learned: String(fd.get('learned') ?? ''),
      severity,
      createdAt: new Date().toISOString(),
    };
    store.addLesson(entry);
    earnXP(40, 'Hata tecrübeye dönüştürüldü');
    e.currentTarget.reset();
  };

  // Sukur
  const handleSukurSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const entry: SukurEntry = {
      id: 's_' + Date.now(),
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
    earnXP(35, 'Şükür ve nimet kaydedildi ✨');
    e.currentTarget.reset();
  };

  // Tespih
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

  // ============================================================
  // BACKUP
  // ============================================================
  const exportData = () => {
    const data = store.exportAll();
    const str = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.href = str;
    a.download = `SAH_Yolculuk_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Yedek İndirildi', 'JSON yedeğiniz cihazınıza kaydedildi.');
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
      } catch { alert('Geçersiz yedek dosyası!'); }
    };
    reader.readAsText(file);
  };

  // Current station metadata
  const currentStation = STATIONS.find(s => s.id === activeStationId);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className={classicMode ? 'classic-mode' : 'journey-mode'}>

      {/* ============ NAVBAR ============ */}
      <nav className="fixed top-0 left-0 right-0 h-[72px] bg-white/92 backdrop-blur-[14px] border-b border-slate-200 z-[1000] flex items-center px-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/25">S</div>
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">SAH WORLD</span>

          {/* Vehicle pill */}
          <button onClick={() => setShowVehicleGarage(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full text-indigo-700 text-xs font-bold hover:shadow-sm transition-all">
            <span>{store.vehicle.icon}</span> {store.vehicle.name}
          </button>

          {/* Streak pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-xs font-bold">
            🔥 {store.streak.current} Gün
          </div>

          {/* XP pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-bold font-mono">
            ✨ {store.xp} XP · {level.icon} {level.name}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setClassicMode(m => !m)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${classicMode ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
            {classicMode ? '📋 Klasik Liste' : '🌐 3D Yolculuk'}
          </button>
          <button onClick={exportData} className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-all">
            💾 Yedek
          </button>
          <label className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
            📂 İçe Aktar
            <input type="file" accept=".json" className="hidden" onChange={importData} />
          </label>
        </div>
      </nav>

      {/* ============ 3D CANVAS (journey mode only) ============ */}
      {!classicMode && (
        <div className="fixed inset-0 z-[1]">
          <JourneyCanvas
            ref={canvasRef}
            vehicleType={store.vehicle.type}
            activeStationId={activeStationId}
            xp={store.xp}
            orbTrigger={store.xpOrbTrigger}
            currentProgress={scrollProgress}
          />
        </div>
      )}

      {/* ============ VIRTUAL SCROLL SPINE ============ */}
      {!classicMode && <div id="journey-scroll-track" style={{ height: '900vh' }} />}

      {/* ============ HERO WELCOME CARD (progress=0) ============ */}
      {!classicMode && scrollProgress < 0.04 && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[600px] max-w-[calc(100vw-32px)] bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl p-10 text-center shadow-2xl shadow-indigo-500/10">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold mb-4">🧭 HAYAT BİR YOLCULUKTUR</span>
          <h1 className="text-5xl font-black tracking-tight mb-3">
            Kendi Evrenini <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">İnşa Et</span>
          </h1>
          <p className="text-slate-500 mb-6">Aşağı kaydırarak yolculuğa başla. Her durakta bir hayat alanını keşfet ve <strong>Ahiret Deponu</strong> nurlandır.</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <div className="text-xs text-slate-400 font-semibold mb-1">GÜNLÜK SERİ</div>
              <div className="text-2xl font-black font-mono text-amber-500">🔥 {store.streak.current}</div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <div className="text-xs text-slate-400 font-semibold mb-1">AMEL XP</div>
              <div className="text-2xl font-black font-mono text-indigo-600">{store.xp}</div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <div className="text-xs text-slate-400 font-semibold mb-1">MERTEBE</div>
              <div className="text-xl font-black text-emerald-600">{level.icon} {level.name}</div>
            </div>
          </div>
          <button onClick={() => jumpToStation(1)} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all text-base">
            🚗 Yolculuğa Başla (Kaydır)
          </button>
        </div>
      )}

      {/* ============ STATION DOCKED PANELS ============ */}
      {!classicMode && STATIONS.filter(s => s.id >= 1 && s.id <= 7).map(st => (
        <div
          key={st.id}
          className={`fixed top-[88px] right-7 w-[580px] max-w-[calc(100vw-48px)] max-h-[calc(100vh-110px)] bg-white/93 backdrop-blur-xl border border-slate-200/85 rounded-3xl shadow-2xl z-50 overflow-y-auto transition-all duration-500 ${activeStationId === st.id ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto' : 'opacity-0 translate-x-16 scale-95 pointer-events-none'}`}
        >
          <div className="p-7">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: st.color + '20', color: st.color }}>
                  {st.id}. DURAK
                </span>
                <span className="text-slate-400 text-sm">{st.label}</span>
              </div>
              <button onClick={() => setActiveStationId(null)} className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all text-sm">✕</button>
            </div>

            {/* Station-specific panel content */}
            {st.id === 1 && <GunlukPanelContent onSubmit={handleJournalSubmit} entries={store.journal.slice(0, 3)} />}
            {st.id === 2 && <KuranPanelContent onSubmit={handleQuranSubmit} entries={store.quranNotes.slice(0, 3)} />}
            {st.id === 3 && <HadisPanelContent onSubmit={handleHadisSubmit} entries={store.hadisNotes.slice(0, 3)} />}
            {st.id === 4 && <MatrisPanelContent eisenhower={store.eisenhower} onAddTask={handleAddTask} onToggle={handleToggleTask} />}
            {st.id === 5 && <HatalarPanelContent onSubmit={handleLessonSubmit} severity={severity} onSeverityChange={setSeverityState} entries={store.lessons.slice(0, 3)} />}
            {st.id === 6 && <SukurPanelContent onSubmit={handleSukurSubmit} entries={store.sukurList.slice(0, 3)} />}
            {st.id === 7 && <MescidimPanelContent tespihCount={store.currentTespih} totalZikir={store.totalZikir} onTespih={handleTespih} zikirType={zikirType} onZikirChange={setZikirType} onReset={store.resetTespih} dailyAyet={DAILY_AYETS[todayIdx]} dailyHadis={DAILY_HADISLER[todayIdx]} />}
          </div>
        </div>
      ))}

      {/* ============ AHIRET DEPOSU FINAL OVERLAY (progress≥97%) ============ */}
      {!classicMode && scrollProgress >= 0.97 && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-60 w-[760px] max-w-[calc(100vw-32px)] max-h-[85vh] overflow-y-auto bg-white/96 backdrop-blur-2xl border-2 border-yellow-300 rounded-3xl p-10 shadow-2xl shadow-yellow-500/20 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-full text-yellow-700 font-bold text-sm mb-4">👑 EBEDİ HAZİNE & MUKAFAT</span>
          <h2 className="text-4xl font-black text-yellow-600 mb-3">Ahiret Deposu</h2>
          <p className="text-slate-500 text-lg max-w-lg mx-auto mb-8">Yolculuk boyunca attığın her samimi adım bu ebedi hazinede birikti.</p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <div className="text-xs text-slate-400 font-bold mb-1">TOPLAM AMEL PUANI</div>
              <div className="text-3xl font-black font-mono text-indigo-600">{store.xp}</div>
              <div className="text-xs text-slate-400 mt-1">XP — Ebedi depoda kilitli</div>
            </div>
            <div className="bg-yellow-50 rounded-2xl p-5 border border-yellow-200">
              <div className="text-xs text-yellow-600 font-bold mb-1">MANEVİ MERTEBE</div>
              <div className="text-2xl font-black text-yellow-600">{level.icon} {level.name}</div>
              <div className="text-xs text-yellow-500 mt-1">{nextLevel ? `${nextLevel.xp - store.xp} XP → ${nextLevel.name}` : 'Zirve!'}</div>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200">
              <div className="text-xs text-emerald-600 font-bold mb-1">TOPLAM ZİKİR</div>
              <div className="text-3xl font-black font-mono text-emerald-600">{store.totalZikir}</div>
              <div className="text-xs text-emerald-500 mt-1">Kayıtlı tespih</div>
            </div>
          </div>

          {/* Badges */}
          <div className="text-left mb-6">
            <h4 className="text-sm font-bold text-slate-600 mb-3">🏅 Manevi Nişanlar & Rozetler</h4>
            <div className="grid grid-cols-4 gap-3">
              {['first_step','week_warrior','sukur_master','zikir_master','kuran_dostu','eisen_master','hadis_alimi','ders_ustası'].map(id => {
                const earned = store.badges.includes(id);
                return (
                  <div key={id} className={`p-3 rounded-xl border text-center text-xs transition-all ${earned ? 'bg-yellow-50 border-yellow-200 opacity-100' : 'bg-slate-50 border-slate-100 opacity-40 grayscale'}`}>
                    <div className="text-2xl mb-1">{earned ? '🏆' : '🔒'}</div>
                    <div className="font-bold text-slate-700">{id.replace(/_/g, ' ')}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={() => jumpToStation(1)} className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all">
              🔄 Yolculuğa Baştan Başla
            </button>
            <button onClick={() => setShowVehicleGarage(true)} className="px-6 py-3 border border-slate-200 bg-white text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all">
              🚗 Aracını Değiştir
            </button>
          </div>
        </div>
      )}

      {/* ============ STATION HUD DOCK (Bottom) ============ */}
      {!classicMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[900] bg-white/94 backdrop-blur-xl border border-slate-200 rounded-full px-2.5 py-1.5 flex items-center gap-1 shadow-xl shadow-black/8">
          {STATIONS.map(st => (
            <button
              key={st.id}
              onClick={() => jumpToStation(st.id)}
              title={st.label}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeStationId === st.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : st.id === 8
                    ? 'bg-yellow-50 border border-yellow-200 text-yellow-600 hover:bg-yellow-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              {st.icon.startsWith('ti-') ? <i className={`ti ${st.icon}`} /> : null}
              {st.name}
            </button>
          ))}
        </div>
      )}

      {/* ============ VEHICLE GARAGE MODAL ============ */}
      {showVehicleGarage && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xl z-[20000] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl max-w-[820px] w-full border border-slate-200 shadow-2xl p-10 text-center">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold mb-4">🚗 BİNEK SEÇİMİ</span>
            <h2 className="text-3xl font-black mb-2">Hangi Araçla Yolculuk Edeceksin?</h2>
            <p className="text-slate-500 mb-8">Hayat yolculuğunda sana eşlik edecek aracını seç.</p>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {(['car','bike','horse','rocket'] as const).map(type => {
                const defs = { car: { icon:'🚗', name:'Otomobil', desc:'Dengeli, kararlı' }, bike: { icon:'🚲', name:'Bisiklet', desc:'Hafif, enerjik' }, horse: { icon:'🐎', name:'Atlı', desc:'Sabırlı, istikrarlı' }, rocket: { icon:'🚀', name:'Roket', desc:'Azimli, süratli' } };
                const d = defs[type];
                return (
                  <button
                    key={type}
                    onClick={() => setPendingVehicle(type)}
                    className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${pendingVehicle === type ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-500/15' : 'border-slate-200 bg-slate-50 hover:border-indigo-200'}`}
                  >
                    <div className="text-5xl">{d.icon}</div>
                    <div className="font-bold text-slate-800">{d.name}</div>
                    <div className="text-xs text-slate-500">{d.desc}</div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                const defs = { car: { type: 'car' as const, name:'Otomobil', icon:'🚗', flavorText:'', color:'#4f46e5' }, bike: { type: 'bike' as const, name:'Bisiklet', icon:'🚲', flavorText:'', color:'#059669' }, horse: { type: 'horse' as const, name:'Atlı', icon:'🐎', flavorText:'', color:'#b8860b' }, rocket: { type: 'rocket' as const, name:'Roket', icon:'🚀', flavorText:'', color:'#ef4444' } };
                store.setVehicle(defs[pendingVehicle]);
                setShowVehicleGarage(false);
                playSuccessChime();
              }}
              className="px-10 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all text-base"
            >
              ✅ Bu Araçla Yola Çık
            </button>
          </div>
        </div>
      )}

      {/* ============ TOAST NOTIFICATIONS ============ */}
      <div className="fixed bottom-20 right-7 z-[10000] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-white border border-slate-200 border-l-4 border-l-indigo-500 rounded-xl px-4 py-3 shadow-xl flex items-start gap-3 min-w-[280px] max-w-sm animate-in slide-in-from-right-5 duration-300">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-lg flex-shrink-0">✨</div>
            <div>
              <div className="text-sm font-bold text-slate-800">{t.title}</div>
              {t.msg && <div className="text-xs text-slate-500 mt-0.5">{t.msg}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ============ SCROLL HINT ============ */}
      {!classicMode && scrollProgress < 0.02 && (
        <div className="fixed bottom-[90px] left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-white/85 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-semibold text-slate-400 border border-slate-200 animate-bounce pointer-events-none">
          ↓ Yol boyunca ilerlemek için aşağı kaydırın
        </div>
      )}
    </div>
  );
}

// ============================================================
// ============================================================
// INLINE PANEL CONTENT COMPONENTS
// ============================================================

interface GunlukProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  entries: JournalEntry[];
}

function GunlukPanelContent({ onSubmit, entries }: GunlukProps) {
  const [mood, setMood] = useState(3);
  return (
    <div>
      <h3 className="text-xl font-black mb-1">Günlük Seyir Defteri</h3>
      <p className="text-sm text-slate-500 mb-4">Bugünün hislerini ve enerjisini kaydet.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="mood" value={mood} />
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-2">Ruh Hali</label>
          <div className="flex gap-2">
            {[[1,'😭','Kötü'],[2,'🙁','Düşük'],[3,'😐','Normal'],[4,'🙂','İyi'],[5,'🤩','Harika']].map(([v,e,l]) => (
              <button type="button" key={v} onClick={() => setMood(Number(v))} className={`flex-1 py-2 rounded-xl border-2 text-center flex flex-col items-center gap-1 transition-all ${mood === Number(v) ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200'}`}>
                <span className="text-2xl">{e}</span><span className="text-[10px] font-bold text-slate-500">{l}</span>
              </button>
            ))}
          </div>
        </div>
        <textarea name="content" required placeholder="Zihnini ve duygularını buraya dök..." className="w-full p-3 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none h-24" />
        <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm">💾 Kaydet (+50 XP)</button>
      </form>
      {entries.length > 0 && (
        <div className="mt-5 space-y-2">
          <h4 className="text-sm font-bold">Son Kayıtlar</h4>
          {entries.map((e: JournalEntry) => (
            <div key={e.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl border-l-4 border-l-indigo-500 text-sm">
              <span className="font-bold">{e.date}</span> · Ruh Hali {e.mood}/5
              <p className="text-slate-500 text-xs mt-1 line-clamp-2">{e.content}</p>
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
    <div>
      <h3 className="text-xl font-black mb-1" style={{color:'#b8860b'}}>Kuran-ı Kerim Günlüğü</h3>
      <p className="text-sm text-slate-500 mb-4">Okuduğun ayetleri ve tefsir notlarını kaydet.</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input name="sure" required placeholder="Sure adı" className="p-2.5 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/10" />
          <input name="ayet" required placeholder="Ayet no" className="p-2.5 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/10" />
        </div>
        <textarea name="tefsir" required placeholder="Tefsir ve açıklama..." className="w-full p-3 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 resize-none h-20" />
        <textarea name="ders" placeholder="Öğrendiğim temel ders..." className="w-full p-3 bg-yellow-50 border-[1.5px] border-yellow-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 resize-none h-16" />
        <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-yellow-600 to-amber-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm">📖 Kaydet (+60 XP)</button>
      </form>
      {entries.length > 0 && <div className="mt-5 space-y-2">
        {entries.map((n: QuranNote) => (
          <div key={n.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm border-l-4 border-l-yellow-500">
            <strong>{n.sure} Suresi, {n.ayet}. Ayet</strong>
            <p className="text-slate-500 text-xs mt-1 line-clamp-2">{n.tefsir}</p>
          </div>
        ))}
      </div>}
    </div>
  );
}

interface HadisProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  entries: HadisNote[];
}

function HadisPanelContent({ onSubmit, entries }: HadisProps) {
  return (
    <div>
      <h3 className="text-xl font-black mb-1 text-emerald-700">Hadis-i Şerif Günlüğü</h3>
      <p className="text-sm text-slate-500 mb-4">Peygamber Efendimiz&apos;den hayatına dokunanları kaydet.</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <textarea name="metin" required placeholder="Hadis metni..." className="w-full p-3 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 resize-none h-20" />
        <div className="grid grid-cols-2 gap-3">
          <select name="kaynak" className="p-2.5 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500">
            {['Buhârî','Müslim','Tirmizî','Ebû Dâvûd','Riyazü\'s-Salihin'].map(k => <option key={k}>{k}</option>)}
          </select>
          <input name="konu" required placeholder="Konu" className="p-2.5 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <textarea name="uygulama" required placeholder="Hayatıma uygulaması..." className="w-full p-3 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 resize-none h-16" />
        <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm">🕌 Kaydet (+60 XP)</button>
      </form>
      {entries.length > 0 && <div className="mt-5 space-y-2">
        {entries.map((n: HadisNote) => (
          <div key={n.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm border-l-4 border-l-emerald-500">
            <strong>{n.konu} ({n.kaynak})</strong>
            <p className="text-slate-500 text-xs mt-1 italic line-clamp-2">&quot;{n.metin}&quot;</p>
          </div>
        ))}
      </div>}
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
    { key: 'q1', label: '🔴 ACİL + ÖNEMLİ', color: '#ef4444', cls: 'border-red-400' },
    { key: 'q2', label: '🟡 ÖNEMLİ', color: '#f59e0b', cls: 'border-amber-400' },
    { key: 'q3', label: '🔵 ACİL', color: '#3b82f6', cls: 'border-blue-400' },
    { key: 'q4', label: '⚪ HİÇBİRİ', color: '#94a3b8', cls: 'border-slate-400' },
  ];
  return (
    <div>
      <h3 className="text-xl font-black mb-1">Eisenhower Matrisi</h3>
      <p className="text-sm text-slate-500 mb-4">Acil ve önemli işlerini doğru önceliklendir.</p>
      <div className="grid grid-cols-2 gap-3">
        {quadrants.map(q => (
          <div key={q.key} className={`bg-white border border-slate-200 rounded-xl p-3 border-t-4 ${q.cls}`}>
            <div className="text-xs font-bold mb-2" style={{color: q.color}}>{q.label}</div>
            <form onSubmit={e => onAddTask(e, q.key)} className="flex gap-1.5 mb-2">
              <input name="text" required placeholder="Görev..." className="flex-1 p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500" />
              <button type="submit" className="px-2 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">+</button>
            </form>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {eisenhower[q.key].map((t: EisenhowerTask) => (
                <div key={t.id} onClick={() => onToggle(q.key, t.id)} className={`flex items-center gap-1.5 p-1.5 rounded-lg cursor-pointer text-xs border transition-all ${t.done ? 'bg-slate-50 border-slate-100 line-through opacity-50' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border flex-shrink-0 ${t.done ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>{t.done ? '✓' : ''}</div>
                  {t.text}
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
    <div>
      <h3 className="text-xl font-black mb-1 text-red-600">Hatalar ve Çıkarılan Dersler</h3>
      <p className="text-sm text-slate-500 mb-4">Hatalarından ders çıkar, geleceğini sağlam inşa et.</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <input name="title" required placeholder="Olay & konu (Örn: Erteleme alışkanlığı)" className="w-full p-2.5 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-500" />
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-2">Şiddet Derecesi</label>
          <div className="flex gap-2">{[1,2,3,4,5].map(v => (
            <button type="button" key={v} onClick={() => onSeverityChange(v)} className={`text-2xl transition-all ${v <= severity ? 'text-red-500' : 'text-slate-200'}`}>★</button>
          ))}</div>
        </div>
        <textarea name="wrong" required placeholder="Ne yanlış gitti?" className="w-full p-3 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-500 resize-none h-16" />
        <textarea name="learned" required placeholder="Çıkarılan ders & aksiyon..." className="w-full p-3 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-500 resize-none h-16" />
        <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm">🛡️ Kaydet (+40 XP)</button>
      </form>
      {entries.length > 0 && <div className="mt-5 space-y-2">
        {entries.map((l: LessonEntry) => (
          <div key={l.id} className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm border-l-4 border-l-red-500">
            <strong>{l.title}</strong>
            <p className="text-slate-500 text-xs mt-1 line-clamp-2">Ders: {l.learned}</p>
          </div>
        ))}
      </div>}
    </div>
  );
}

interface SukurProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  entries: SukurEntry[];
}

function SukurPanelContent({ onSubmit, entries }: SukurProps) {
  return (
    <div>
      <h3 className="text-xl font-black mb-1 text-emerald-700">Şükür ve Nimet Köşesi</h3>
      <p className="text-sm text-emerald-600 mb-4">&quot;Şükrederseniz elbette artırırım.&quot; (İbrahim 14:7)</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <textarea name="text" required placeholder="Bugün neye şükredeceksin?" className="w-full p-3 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 resize-none h-20" />
        <div className="grid grid-cols-3 gap-2">
          <input name="n1" required placeholder="1. Nimet" className="p-2.5 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
          <input name="n2" required placeholder="2. Nimet" className="p-2.5 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
          <input name="n3" required placeholder="3. Nimet" className="p-2.5 bg-white border-[1.5px] border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm">✨ Kaydet (+35 XP)</button>
      </form>
      {entries.length > 0 && <div className="mt-5 space-y-2">
        {entries.map((s: SukurEntry) => (
          <div key={s.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs border-l-4 border-l-emerald-500">&quot;{s.text.slice(0, 80)}...&quot;</div>
        ))}
      </div>}
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

function MescidimPanelContent({ tespihCount, totalZikir, onTespih, zikirType, onZikirChange, onReset, dailyAyet, dailyHadis }: MescidimProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-black text-emerald-700">Dijital Mescid</h3>
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-center">
        <div className="text-xs font-bold text-emerald-600 mb-3">{zikirType}</div>
        <button onClick={onTespih}
          className="w-28 h-28 rounded-full border-4 border-emerald-500 bg-white text-emerald-600 flex flex-col items-center justify-center mx-auto shadow-lg shadow-emerald-500/15 hover:shadow-xl transition-all active:scale-90 cursor-pointer">
          <span className="text-4xl font-black font-mono leading-none">{tespihCount}</span>
          <span className="text-xs text-slate-400 mt-1">Hedef: 33</span>
        </button>
        <div className="flex gap-2 justify-center mt-4">
          <select value={zikirType} onChange={e => { onZikirChange(e.target.value); onReset(); }} className="p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-semibold">
            {['Subhanallah','Elhamdulillah','Allahu Ekber','La ilahe illallah','Astagfirullah'].map(z => <option key={z}>{z}</option>)}
          </select>
          <button onClick={onReset} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100">↺ Sıfırla</button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Toplam: {totalZikir} zikir</p>
      </div>
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
        <div className="text-xs font-bold text-yellow-600 mb-1">GÜNÜN AYETİ</div>
        <p className="text-sm text-slate-700 italic">{dailyAyet.turkish}</p>
      </div>
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
        <div className="text-xs font-bold text-emerald-600 mb-1">GÜNÜN HADİSİ</div>
        <p className="text-sm text-slate-700 italic">{dailyHadis}</p>
      </div>
    </div>
  );
}
