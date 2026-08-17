'use client';

import { useState, useMemo } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import type { JournalEntry, QuranNote, HadisNote, LessonEntry, SukurEntry } from '@/types';

type HistoryItemType = 'journal' | 'quran' | 'hadis' | 'lesson' | 'sukur';

interface HistoryItem {
  id: string;
  type: HistoryItemType;
  date: string;
  createdAt: string;
  title: string;
  preview: string;
  icon: string;
}

export default function HistoryTab() {
  const store = useJourneyStore();
  const [filter, setFilter] = useState<HistoryItemType | 'all'>('all');

  const allItems = useMemo(() => {
    const items: HistoryItem[] = [];

    store.journal.forEach((j: JournalEntry) => {
      items.push({
        id: j.id,
        type: 'journal',
        date: j.date,
        createdAt: j.createdAt,
        title: 'Günlük Kaydı',
        preview: j.content,
        icon: '📖'
      });
    });

    store.quranNotes.forEach((q: QuranNote) => {
      items.push({
        id: q.id,
        type: 'quran',
        date: q.date,
        createdAt: q.createdAt,
        title: `Kuran: ${q.sure}, ${q.ayet}. Ayet`,
        preview: q.ders,
        icon: '🕋'
      });
    });

    store.hadisNotes.forEach((h: HadisNote) => {
      items.push({
        id: h.id,
        type: 'hadis',
        date: h.date,
        createdAt: h.createdAt,
        title: 'Hadis Notu',
        preview: h.konu,
        icon: '📜'
      });
    });

    store.lessons.forEach((l: LessonEntry) => {
      items.push({
        id: l.id,
        type: 'lesson',
        date: l.date,
        createdAt: l.createdAt,
        title: `Hata: ${l.title}`,
        preview: l.learned,
        icon: '🎯'
      });
    });

    store.sukurList.forEach((s: SukurEntry) => {
      items.push({
        id: s.id,
        type: 'sukur',
        date: s.date,
        createdAt: s.createdAt,
        title: 'Şükür',
        preview: s.text,
        icon: '💖'
      });
    });

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [store.journal, store.quranNotes, store.hadisNotes, store.lessons, store.sukurList]);

  const filteredItems = filter === 'all' ? allItems : allItems.filter(i => i.type === filter);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
      
      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 mb-8">
        {(['all', 'journal', 'quran', 'hadis', 'lesson', 'sukur'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filter === f 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {f === 'all' && 'Tümü'}
            {f === 'journal' && '📖 Günlük'}
            {f === 'quran' && '🕋 Kuran'}
            {f === 'hadis' && '📜 Hadis'}
            {f === 'lesson' && '🎯 Hatalar'}
            {f === 'sukur' && '💖 Şükür'}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <div className="text-4xl mb-4">🏜️</div>
          <p>Henüz burada bir kayıt yok.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-2xl p-5 flex gap-5">
              <div className="w-12 h-12 rounded-full bg-black/40 border border-white/5 flex flex-shrink-0 items-center justify-center text-2xl shadow-inner">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mb-1">
                  <h4 className="text-white font-bold truncate">{item.title}</h4>
                  <span className="text-xs text-slate-500 font-mono">{new Date(item.createdAt).toLocaleString('tr-TR')}</span>
                </div>
                <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
                  {item.preview}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
