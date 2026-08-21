import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FeedbackClient } from './feedback-client'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function FeedbackPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: items } = await supabase.from('feedback').select('*').eq('user_id', user.id).is('archived_at', null).order('created_at', { ascending: false }).limit(30)

  return <main className="feedback-page">
    <header className="standalone-header"><Link className="standalone-brand" href="/"><span>S</span><strong>SAH</strong></Link><div><Link href="/">Evren’e dön</Link>{user.app_metadata?.role === 'admin' && <Link href="/admin/feedback">Yönetim</Link>}</div></header>
    <FeedbackClient initialItems={items || []} />
  </main>
}
