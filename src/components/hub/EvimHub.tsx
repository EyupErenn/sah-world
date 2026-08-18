'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import ProfileTab from './ProfileTab';
import HistoryTab from './HistoryTab';
import SettingsTab from './SettingsTab';
import FriendsTab from './FriendsTab';
import ChatTab from './ChatTab';

interface Props {
  onClose: () => void;
}

export default function EvimHub({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'friends' | 'chat' | 'settings'>('profile');
  const { profile } = useAuthStore();

  const tabs = [
    { id: 'profile', icon: '👤', label: 'Profilim' },
    { id: 'history', icon: '📜', label: 'Geçmişim' },
    { id: 'friends', icon: '🤝', label: 'Arkadaşlarım' },
    { id: 'chat', icon: '💬', label: 'Sohbet' },
    { id: 'settings', icon: '⚙️', label: 'Ayarlar' },
  ] as const;

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-[20000] flex bg-[#08091a]/95 backdrop-blur-2xl animate-in fade-in duration-300">
      
      {/* ── Sol Menü (Glass Side Navigation) ── */}
      <div className="w-20 md:w-64 h-full border-r border-white/5 bg-[#0b0f19]/70 flex flex-col pt-8 pb-6 shadow-2xl backdrop-blur-3xl">
        <div className="px-6 mb-8 hidden md:block text-center">
          <div className="relative w-20 h-20 mx-auto mb-3">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 blur-md opacity-60 aurora-pulse" />
            <div className="w-20 h-20 relative rounded-full border-2 border-indigo-400/40 overflow-hidden bg-slate-900 shadow-xl">
              <img 
                src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.display_name}`} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <h2 className="text-white font-extrabold text-base tracking-wide truncate">{profile.display_name}</h2>
          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-mono text-[11px] border border-indigo-500/20">
            Seviye {Math.floor(profile.xp / 1000) + 1}
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-indigo-600/25 text-indigo-200 font-bold border border-indigo-500/30 shadow-lg shadow-indigo-500/10' 
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="hidden md:inline-block text-xs font-medium tracking-wide">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-3 mt-auto">
          <button 
            onClick={onClose}
            className="w-full flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer border border-rose-500/20 shadow-sm"
          >
            <span className="text-xl">🚪</span>
            <span className="hidden md:inline-block font-semibold text-xs">Evden Çık</span>
          </button>
        </div>
      </div>

      {/* ── Sağ İçerik Alanı ── */}
      <div className="flex-1 h-full overflow-hidden flex flex-col relative">
        <header className="min-h-16 border-b border-white/5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-8 py-3 bg-black/15 backdrop-blur-md">
          <h1 className="min-w-0 text-lg font-black text-white tracking-wider flex items-center gap-2">
            <span className="flex-shrink-0">{tabs.find(t => t.id === activeTab)?.icon}</span>
            <span className="truncate">{tabs.find(t => t.id === activeTab)?.label}</span>
          </h1>
          
          <button
            onClick={onClose}
            className="justify-self-end shrink-0 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-xs font-bold border border-white/10 flex items-center gap-1.5 cursor-pointer"
          >
            <span className="hidden sm:inline">Kapat</span>
            <span>✕</span>
          </button>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'history' && <HistoryTab />}
          {activeTab === 'friends' && <FriendsTab />}
          {activeTab === 'chat' && <ChatTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>

    </div>
  );
}
