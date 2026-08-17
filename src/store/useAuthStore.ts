import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/lib/supabase';

// ============================================================
// AUTH STORE — Session, Profile ve Loading State
// ============================================================

interface AuthState {
  // Auth
  session: Session | null;
  user: User | null;
  profile: Profile | null;

  // Loading states
  isAuthLoading: boolean;   // initial session check sürüyor
  isProfileLoading: boolean; // profil DB'den çekiliyor

  // Error
  authError: string | null;

  // ============================================================
  // ACTIONS
  // ============================================================
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setIsProfileLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;

  /** Tümünü sıfırla (signOut) */
  reset: () => void;

  /** Profil alanlarını kısmen güncelle (display_name, avatar_url, vb.) */
  patchProfile: (patch: Partial<Profile>) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isAuthLoading: true,   // başta true — ilk getSession tamamlanana kadar loading göster
  isProfileLoading: false,
  authError: null,

  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setIsAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  setIsProfileLoading: (isProfileLoading) => set({ isProfileLoading }),
  setAuthError: (authError) => set({ authError }),

  reset: () =>
    set({
      session: null,
      user: null,
      profile: null,
      isAuthLoading: false,
      isProfileLoading: false,
      authError: null,
    }),

  patchProfile: (patch) => {
    const current = get().profile;
    if (!current) return;
    set({ profile: { ...current, ...patch } });
  },
}));
