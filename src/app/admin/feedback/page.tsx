import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AdminFeedbackClient } from './admin-feedback-client'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { FeedbackStatus } from '@/types/database'

type Params = { status?: string; type?: string; rating?: string; search?: string; sort?: string; page?: string; archived?: string; from?: string; to?: string }

const safeDate = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null

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
      filter_from: safeDate(params.from), filter_to: safeDate(params.to),
    }),
  ])

  if (error) console.error('[SAH Admin] Geri bildirim listesi alınamadı', { code: error.code })
  return <main className="admin-feedback-page"><AdminFeedbackClient items={items || []} stats={stats?.[0] || null} currentPage={page} filters={params} /></main>
}
