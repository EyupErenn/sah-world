import SahApp from '@/components/core/SahApp';
import { AuthProvider } from '@/providers/AuthProvider';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    : { data: null }

  return <AuthProvider initialUser={user} initialProfile={profile}><SahApp initialUser={user} initialProfile={profile} /></AuthProvider>
}
