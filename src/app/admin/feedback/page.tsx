import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AdminFeedbackClient } from './admin-feedback-client'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { FeedbackStatus } from '@/types/database'

type Params = { status?: string; type?: string; rating?: string; search?: string; sort?: string; page?: string; archived?: string }

export default async function AdminFeedbackPage({ searchParams }: { searchParams: Promise<Params> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  if (user.app_metadata?.role !== 'admin') return <main className="admin-denied"><section><span>⌁</span><p className="eyebrow">Korumalı alan</p><h1>Yönetici erişimi gerekiyor</h1><p>Bu sayfadaki içerik yalnızca sunucu tarafından doğrulanmış yöneticilere gösterilir.</p><Link href="/">Evren’e dön</Link></section></main>

  const params = await searchParams
  const page = Math.max(1, Number.parseInt(params.page || '1', 10) || 1)
  const rating = params.rating ? Number.parseInt(params.rating, 10) : null
  const status = ['received','reviewing','planned','completed','closed'].includes(params.status || '') ? params.status as FeedbackStatus : null
  const [{ data: stats }, { data: items, error }] = await Promise.all([
    supabase.rpc('admin_feedback_stats'),
    supabase.rpc('admin_list_feedback', {
      filter_status: status, filter_type: params.type || null, filter_rating: rating,
      search_text: params.search?.slice(0, 120) || null, sort_order: params.sort === 'oldest' ? 'oldest' : 'newest',
      page_number: page, page_size: 20, include_archived: params.archived === 'true',
    }),
  ])

  if (error) console.error('[SAH Admin] feedback list failed:', error.message)
  return <main className="admin-feedback-page"><AdminFeedbackClient items={items || []} stats={stats?.[0] || null} currentPage={page} filters={params} /></main>
}
