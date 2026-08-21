import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
import type { Database, ProfileRow, ChatMessageRow } from '@/types/database'

// Env tanımlı değilse client constructor'ı fırlatmasın diye güvenli fallback.
// Gerçek env varken gerçek değerler kullanılır; yoksa istekler ağ katmanında
// sessizce başarısız olur (çağıran tarafta try/catch ile yakalanır).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key-placeholder'

type PublicAuthSettings = {
  external?: { google?: boolean }
}

/**
 * Google OAuth'a yönlendirmeden önce herkese açık Auth ayarını kontrol eder.
 * Böylece sağlayıcı kapalıyken kullanıcı Supabase'in ham JSON hata sayfasına düşmez.
 */
export async function getGoogleAuthAvailability(): Promise<boolean | null> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const settings = await response.json() as PublicAuthSettings
    return settings.external?.google === true
  } catch {
    return null
  }
}

const makeClient = () =>
  createSupabaseBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// Tarayıcı client'ı tek örnek (singleton). @supabase/ssr oturumu cookie'de
// saklar; böylece aynı kullanıcı Server Component/Action katmanında da doğrulanır.
let browserClient: ReturnType<typeof makeClient> | null = null

export const createBrowserClient = () => {
  if (!browserClient) browserClient = makeClient()
  return browserClient
}

// Kolaylık için default export (bileşenler doğrudan import edebilir)
export const supabase = createBrowserClient()

// Database tip tanımları (Supabase codegen yerine elle — basit kalması için)
export type Profile = ProfileRow

export type JournalEntryRow = {
  id: string
  user_id: string
  date: string
  mood: number
  energy: number
  stress: number
  sleep: number | null
  content: string
  tags: string[]
  created_at: string
}

export type QuranNoteRow = {
  id: string
  user_id: string
  date: string
  sure: string
  ayet: string
  tefsir: string
  ders: string
  created_at: string
}

export type HadisNoteRow = {
  id: string
  user_id: string
  date: string
  metin: string
  kaynak: string
  konu: string
  uygulama: string
  created_at: string
}

export type LessonEntryRow = {
  id: string
  user_id: string
  date: string
  title: string
  wrong: string
  learned: string
  severity: number
  created_at: string
}

export type SukurEntryRow = {
  id: string
  user_id: string
  date: string
  text: string
  nimet1: string
  nimet2: string
  nimet3: string
  created_at: string
}

export type EisenhowerTaskRow = {
  id: string
  user_id: string
  quadrant: 'q1' | 'q2' | 'q3' | 'q4'
  text: string
  done: boolean
  created_at: string
}

export type TespihLogRow = {
  id: string
  user_id: string
  date: string
  count: number
}

export type Friendship = {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted'
  created_at: string
}

export type ChatMessage = ChatMessageRow

export type PublicProfileSummary = {
  id: string
  display_name: string
  avatar_url: string | null
  xp: number
  streak_current: number
  badges: string[]
}
