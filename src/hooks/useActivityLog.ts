'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import type { IntegratedActivity } from '@/types'

type State = { items: IntegratedActivity[]; loading: boolean; error: boolean }

function mapRow(row: Record<string, unknown>): IntegratedActivity {
  return {
    id: String(row.id),
    category: String(row.category) as IntegratedActivity['category'],
    label: String(row.label),
    detail: String(row.detail ?? ''),
    xp: Number(row.xp_amount ?? 0),
    occurredAt: String(row.occurred_at),
    sourceView: String(row.source_view),
  }
}

export function useActivityLog(fromDate?: string, toDate?: string) {
  const user = useAuthStore((state) => state.session?.access_token === 'mock-token' ? null : state.session?.user ?? null)
  const [state, setState] = useState<State>({ items: [], loading: true, error: false })

  const load = useCallback(async () => {
    if (!user) {
      setState({ items: [], loading: false, error: false })
      return
    }
    const { data, error } = await supabase.rpc('get_my_activity_log', {
      from_date: fromDate ?? null,
      to_date: toDate ?? null,
    })
    if (error) {
      // Migration rollout and offline development both fall back to the
      // existing local activity feed without breaking the journal.
      setState((current) => ({ ...current, loading: false, error: true }))
      return
    }
    setState({ items: ((data ?? []) as unknown as Record<string, unknown>[]).map(mapRow), loading: false, error: false })
  }, [fromDate, toDate, user])

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0)
    const refresh = () => void load()
    const poll = window.setInterval(refresh, 60_000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('sah:activity-changed', refresh)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(poll)
      window.removeEventListener('sah:activity-changed', refresh)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [load])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    let refreshTimer: number | null = null
    let channel: ReturnType<typeof supabase.channel> | null = null
    const scheduleRefresh = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => void load(), 220)
    }

    const filter = `user_id=eq.${user.id}`
    if (!cancelled) {
      channel = supabase
        .channel(`activity-log-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries', filter }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quran_notes', filter }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hadis_notes', filter }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'eisenhower_tasks', filter }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_entries', filter }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sukur_entries', filter }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions', filter }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_spiritual_links', filter }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_lesson_progress', filter }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'xp_events', filter }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tespih_log', filter }, scheduleRefresh)
        .subscribe()
    }

    return () => {
      cancelled = true
      if (refreshTimer) window.clearTimeout(refreshTimer)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [load, user])

  return { ...state, refresh: load }
}

export function notifyActivityChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('sah:activity-changed'))
}
