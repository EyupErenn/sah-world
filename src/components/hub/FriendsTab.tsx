'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

type PublicProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  xp: number;
  streak_current: number;
};

type Friendship = {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
};

export default function FriendsTab() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [friends, setFriends] = useState<{ profile: PublicProfile, status: string, fid: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFriends = async () => {
    if (!user) return;
    try {
      // Supabase'den pending/accepted arkadaşlıkları getir
      // RPC yazmıştık veya doğrudan friendships tablosuna join yapabiliriz.
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id, status, user_id, friend_id
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
        
      if (error) throw error;
      
      // Profilleri çekelim
      const otherIds = (data || []).map(f => f.user_id === user.id ? f.friend_id : f.user_id);
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', otherIds);
        const enriched = (data || []).map(f => {
          const isSender = f.user_id === user.id;
          const otherId = isSender ? f.friend_id : f.user_id;
          const prof = profiles?.find(p => p.id === otherId);
          return {
            fid: f.id,
            status: f.status === 'pending' && !isSender ? 'received' : f.status, 
            // status: 'accepted', 'pending' (biz gönderdik), 'received' (bize geldi)
            profile: prof as PublicProfile,
          };
        }).filter(f => f.profile);
        setFriends(enriched);
      } else {
        setFriends([]);
      }
    } catch (err) {
      console.warn('Arkadaş listesi alınamadı:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_users_by_name', { 
        search_term: searchQuery.trim(), 
        limit_count: 10 
      });
      if (error) throw error;
      setSearchResults((data || []).filter((p: any) => p.id !== user.id));
    } catch (err) {
      console.warn('Arama hatası:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (targetId: string) => {
    if (!user) return;
    await supabase.from('friendships').insert({
      user_id: user.id,
      friend_id: targetId,
      status: 'pending'
    });
    setSearchResults(prev => prev.filter(p => p.id !== targetId));
    fetchFriends(); // Listeyi yenile
  };

  const handleAccept = async (fid: string) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', fid);
    fetchFriends();
  };

  const handleRejectOrCancel = async (fid: string) => {
    await supabase.from('friendships').delete().eq('id', fid);
    fetchFriends();
  };

  const accepted = friends.filter(f => f.status === 'accepted');
  const received = friends.filter(f => f.status === 'received');
  const sent = friends.filter(f => f.status === 'pending');

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 fade-in">
      
      {/* ── Arama Bölümü ── */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>🔍</span> Yeni Yol Arkadaşı Bul
        </h3>
        
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Kullanıcı adı (Görünen Ad)..."
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button 
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            {isSearching ? '...' : 'Ara'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-2 mt-4 bg-black/20 p-4 rounded-2xl border border-white/5">
            <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Arama Sonuçları</h4>
            {searchResults.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <img 
                    src={p.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${p.display_name}`}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full bg-black/50 border border-white/10"
                  />
                  <div>
                    <div className="font-bold text-white">{p.display_name}</div>
                    <div className="text-xs text-slate-400">Seviye {Math.floor(p.xp / 1000) + 1}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleSendRequest(p.id)}
                  className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white rounded-lg text-xs font-bold transition-colors"
                >
                  İstek Gönder
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Arkadaş Listeleri ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Arkadaşların */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <span>🤝</span> Arkadaşların ({accepted.length})
          </h3>
          
          {isLoading ? (
            <div className="text-slate-500 text-sm animate-pulse">Yükleniyor...</div>
          ) : accepted.length === 0 ? (
            <div className="text-slate-500 text-sm">Henüz kimseyi eklemedin.</div>
          ) : (
            <div className="space-y-3">
              {accepted.map(f => (
                <div key={f.fid} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <img 
                      src={f.profile.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${f.profile.display_name}`}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full bg-black/50 border border-white/10"
                    />
                    <div>
                      <div className="font-bold text-white">{f.profile.display_name}</div>
                      <div className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                        <span>🔥 {f.profile.streak_current}</span>
                        <span className="text-slate-500 ml-1">| Sev {Math.floor(f.profile.xp / 1000) + 1}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleRejectOrCancel(f.fid)} className="text-slate-500 hover:text-rose-400 text-xs px-2 py-1 rounded transition-colors" title="Arkadaşlıktan Çıkar">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* İstekler */}
        <div className="space-y-6">
          {/* Gelen İstekler */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>📥</span> Gelen İstekler ({received.length})
            </h3>
            
            {received.length === 0 ? (
              <div className="text-slate-500 text-sm">Bekleyen istek yok.</div>
            ) : (
              <div className="space-y-3">
                {received.map(f => (
                  <div key={f.fid} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 gap-3">
                    <div className="flex items-center gap-3">
                      <img src={f.profile.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${f.profile.display_name}`} alt="Avatar" className="w-8 h-8 rounded-full" />
                      <div className="font-bold text-white text-sm">{f.profile.display_name}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(f.fid)} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-colors">Kabul Et</button>
                      <button onClick={() => handleRejectOrCancel(f.fid)} className="px-3 py-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg text-xs font-bold transition-colors">Reddet</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Giden İstekler */}
          {sent.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                <span>📤</span> Giden İstekler ({sent.length})
              </h3>
              <div className="space-y-2">
                {sent.map(f => (
                  <div key={f.fid} className="flex items-center justify-between p-2 bg-black/20 rounded-lg border border-white/5">
                    <div className="text-sm text-slate-300">{f.profile.display_name}</div>
                    <button onClick={() => handleRejectOrCancel(f.fid)} className="text-xs text-rose-400 hover:underline">İptal Et</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
