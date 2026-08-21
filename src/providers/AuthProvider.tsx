'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';

// ============================================================
// Context
// ============================================================
const AuthContext = createContext<null>(null);
export const useAuthContext = () => useContext(AuthContext);

// ============================================================
// AuthProvider — server-verified identity + browser auth event bridge
// ============================================================
export function AuthProvider({ children, initialUser, initialProfile }: { children: React.ReactNode; initialUser: User | null; initialProfile: Profile | null }) {
  const { setSession, setUser, setProfile, setIsAuthLoading, reset } = useAuthStore();
  const initialized = useRef(false);

  // Veri senkronizasyonu (Supabase'den çekme + migrasyon)
  useSupabaseSync();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setUser(initialUser);
    setProfile(initialProfile);
    setIsAuthLoading(false);

    // Cookie tabanlı ilk durum sunucuda doğrulanır; bu çağrı yalnızca browser
    // session nesnesini eşler. Keyfi timeout, geçerli oturumu login ekranına düşürmez.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.error('[SAH Auth] Browser session eşleme hatası', { name: err instanceof Error ? err.name : 'UnknownError' });
      })
      .finally(() => {
        setIsAuthLoading(false);
      });

    // 2. Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthLoading(false);

        if (event === 'SIGNED_OUT') {
          reset();
          useJourneyStore.getState().resetStore();
          if (typeof window !== 'undefined') {
            localStorage.removeItem('sah-world-store');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [initialProfile, initialUser, reset, setIsAuthLoading, setProfile, setSession, setUser]);

  return (
    <AuthContext.Provider value={null}>
      {children}
    </AuthContext.Provider>
  );
}
