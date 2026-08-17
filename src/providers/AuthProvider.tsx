'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';

// ============================================================
// Context
// ============================================================
const AuthContext = createContext<null>(null);
export const useAuthContext = () => useContext(AuthContext);

// ============================================================
// AuthProvider with Fail-Safe Timeout
// ============================================================
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setUser, setIsAuthLoading, reset } = useAuthStore();
  const initialized = useRef(false);

  // Veri senkronizasyonu (Supabase'den çekme + migrasyon)
  useSupabaseSync();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Fail-safe Timeout: 3 saniye içinde session kontrolü bitmezse loading'i zorla kapat
    const safetyTimeout = setTimeout(() => {
      console.warn('[SAH Auth] Session check timeout (3s fallback triggered). Setting isAuthLoading=false.');
      setIsAuthLoading(false);
    }, 3000);

    // 1. İlk session kontrolü
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.error('[SAH Auth] getSession error:', err);
      })
      .finally(() => {
        clearTimeout(safetyTimeout);
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
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={null}>
      {children}
    </AuthContext.Provider>
  );
}
