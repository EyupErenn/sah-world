'use client';
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useJourneyStore } from '@/store/useJourneyStore';

export default function SettingsTab() {
  const { profile, patchProfile } = useAuthStore();
  const store = useJourneyStore();

  const [name, setName] = useState(profile?.display_name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState('');

  if (!profile) return null;

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setIsSavingName(true);
    setNameMsg('');
    try {
      const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', profile.id);
      if (error) throw error;
      patchProfile({ display_name: name.trim() });
      setNameMsg('✅ İsim güncellendi!');
      setTimeout(() => setNameMsg(''), 3000);
    } catch {
      setNameMsg('❌ Bir hata oluştu.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleNewAvatar = async () => {
    // Rastgele bir kelime ile yeni bir seed oluştur
    const newSeed = Math.random().toString(36).substring(7);
    const newUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${newSeed}`;
    
    patchProfile({ avatar_url: newUrl }); // optimistic
    await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', profile.id);
  };

  const currentAvatarUrl = profile.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.display_name}`;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 fade-in pb-12">
      
      {/* ── Profil Ayarları ── */}
      <section className="sah-card p-6 md:p-8">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span>⚙️</span> Profil Ayarları
        </h3>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Avatar Değiştir */}
          <div className="sah-card flex flex-col items-center gap-3 p-4">
            <div className="w-24 h-24 rounded-full ring-2 ring-indigo-500/40 bg-black/40 overflow-hidden">
              <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <button 
              onClick={handleNewAvatar}
              className="sah-button-secondary text-xs px-3 py-2"
            >
              🎲 Yeni Avatar
            </button>
          </div>

          {/* İsim Değiştir */}
          <div className="flex-1 w-full space-y-3">
            <label className="block text-sm font-semibold text-slate-400">Görünen Ad</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                className="glass-input flex-1 px-4 py-3 text-white"
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName || name.trim() === profile.display_name}
                className="sah-button-primary px-6 py-3 disabled:opacity-40"
              >
                {isSavingName ? '...' : 'Kaydet'}
              </button>
            </div>
            {nameMsg && <div className="text-sm font-mono text-emerald-400">{nameMsg}</div>}
          </div>
        </div>
      </section>

      {/* ── Araç Seçimi (Garage) ── */}
      <section className="sah-card p-6 md:p-8">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span>🚗</span> Manevi Binek Seçimi
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['car','bike','horse','rocket'] as const).map(type => {
            const defs = {
              car: { type: 'car' as const, name: 'Otomobil', icon: '🚗', flavorText: '', color: '#6366f1', desc: 'Dengeli & konforlu' },
              bike: { type: 'bike' as const, name: 'Bisiklet', icon: '🚲', flavorText: '', color: '#10b981', desc: 'Hafif & manevralı' },
              horse: { type: 'horse' as const, name: 'Atlı', icon: '🐎', flavorText: '', color: '#d97706', desc: 'Kadim & asil' },
              rocket: { type: 'rocket' as const, name: 'Roket', icon: '🚀', flavorText: '', color: '#ef4444', desc: 'Süratli & yüksek idealli' },
            };
            const d = defs[type];
            const isSelected = store.vehicle.type === type;
            
            return (
              <button
                key={type}
                onClick={() => {
                  store.setVehicle(d); // Bu call artık Supabase'e de yazar (optimistic UI)
                }}
                className={`sah-card p-4 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-indigo-400/60 bg-indigo-600/20 shadow-lg shadow-indigo-500/25 -translate-y-0.5'
                    : 'bg-black/20 hover:bg-white/5 hover:-translate-y-0.5'
                }`}
              >
                <div className="text-4xl my-1">{d.icon}</div>
                <div className="font-bold text-white text-sm">{d.name}</div>
                <div className="text-[10px] text-slate-400 text-center">{d.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Oturum ── */}
      <section className="sah-card bg-rose-500/5 p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-rose-400 mb-1">Hesaptan Çıkış Yap</h3>
          <p className="text-xs text-rose-400/70">Köyden ayrılır ama verilerin güvende kalır.</p>
        </div>
        <button
          onClick={handleSignOut}
          className="sah-button-danger px-6 py-3 w-full sm:w-auto whitespace-nowrap"
        >
          Çıkış Yap
        </button>
      </section>

    </div>
  );
}
