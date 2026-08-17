'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { ChatMessage } from '@/lib/supabase';

type ChatFriend = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  last_message: string | null;
  last_message_time: string | null;
};

export default function ChatTab() {
  const { user } = useAuthStore();
  const [friends, setFriends] = useState<ChatFriend[]>([]);
  const [activeFriend, setActiveFriend] = useState<ChatFriend | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Arkadaş listesini (son mesajlarla birlikte) çek
  const fetchFriends = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_friends_with_last_message');
      if (error) throw error;
      setFriends(data || []);
    } catch (err) {
      console.warn('Sohbet arkadaşları alınamadı:', err);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [user]);

  // 2. Aktif arkadaş değiştiğinde mesajları çek
  useEffect(() => {
    if (!user || !activeFriend) return;
    
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeFriend.id}),and(sender_id.eq.${activeFriend.id},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true })
          .limit(50);
          
        if (error) throw error;
        setMessages(data as ChatMessage[]);
      } catch (err) {
        console.warn('Mesajlar alınamadı:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    
    loadMessages();

    // Okundu olarak işaretle (Bize gelenleri)
    supabase.from('chat_messages')
      .update({ is_read: true })
      .eq('sender_id', activeFriend.id)
      .eq('receiver_id', user.id)
      .eq('is_read', false)
      .then();

  }, [user, activeFriend]);

  // 3. Supabase Realtime Subscription (Sohbet açıkken yeni mesaj gelirse)
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('realtime:chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          // Sadece bize gelen VEYA bizim gönderdiğimiz mesajları dinle
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Eğer şu an açık olan sohbete aitse listeye ekle
          if (activeFriend && (
            (newMsg.sender_id === user.id && newMsg.receiver_id === activeFriend.id) ||
            (newMsg.sender_id === activeFriend.id && newMsg.receiver_id === user.id)
          )) {
            setMessages(prev => [...prev, newMsg]);
            
            // Bize gelmişse ve ekrandaysa hemen okundu işaretle
            if (newMsg.sender_id === activeFriend.id) {
              supabase.from('chat_messages').update({ is_read: true }).eq('id', newMsg.id).then();
            }
          }
          // Arkadaş listesini (son mesajı) güncelle
          fetchFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeFriend]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeFriend || !newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage('');

    // Optimistic UI update for immediate feedback could be added here
    
    try {
      const { error } = await supabase.from('chat_messages').insert({
        sender_id: user.id,
        receiver_id: activeFriend.id,
        content
      });
      if (error) throw error;
      // Realtime subscription will append it to messages and update friends list
    } catch (err) {
      console.warn('Mesaj gönderilemedi:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] min-h-[500px] flex gap-4 animate-in slide-in-from-bottom-4 duration-500 fade-in">
      
      {/* ── Sol: Arkadaş Listesi ── */}
      <div className="w-1/3 md:w-80 bg-white/5 border border-white/10 rounded-3xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-white/5 bg-black/20">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>💭</span> Sohbetler
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {friends.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Henüz kimseyle arkadaş değilsin.
            </div>
          ) : (
            friends.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFriend(f)}
                className={`w-full flex items-start gap-3 p-3 rounded-2xl transition-all cursor-pointer text-left ${
                  activeFriend?.id === f.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                    : 'hover:bg-white/5 text-slate-300'
                }`}
              >
                <img 
                  src={f.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${f.display_name}`} 
                  alt="Avatar" 
                  className="w-12 h-12 rounded-full bg-black/30 border border-white/10 flex-shrink-0"
                />
                <div className="flex-1 min-w-0 overflow-hidden pt-0.5">
                  <div className="font-bold text-sm truncate">{f.display_name}</div>
                  <div className={`text-xs truncate ${activeFriend?.id === f.id ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {f.last_message || 'Sohbete başla...'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Sağ: Mesajlaşma Alanı ── */}
      <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl flex flex-col overflow-hidden relative">
        {activeFriend ? (
          <>
            {/* Sohbet Başlığı */}
            <div className="h-16 px-6 border-b border-white/5 bg-black/20 flex items-center gap-3">
              <img 
                src={activeFriend.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${activeFriend.display_name}`} 
                alt="Avatar" 
                className="w-9 h-9 rounded-full bg-black/30"
              />
              <span className="font-bold text-white">{activeFriend.display_name}</span>
            </div>

            {/* Mesaj Listesi */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
                  <span className="text-4xl">👋</span>
                  <p>İlk mesajı sen gönder!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-600/20' 
                          : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-white/5 shadow-md shadow-black/20'
                      }`}>
                        {msg.content}
                        <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-slate-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Mesaj Gönderme */}
            <div className="p-4 bg-black/30 border-t border-white/5">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Mesaj yaz..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 text-white rounded-xl transition-colors cursor-pointer flex-shrink-0"
                >
                  <span className="text-xl -ml-1">➤</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <span className="text-5xl mb-4 opacity-50">💭</span>
            <p>Sohbet etmek için sol taraftan bir arkadaş seçin.</p>
          </div>
        )}
      </div>

    </div>
  );
}
