'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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
  const [state, setState] = useState<State>({ items: [], loading: true, error: false })

  const load = useCallback(async () => {
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
  }, [fromDate, toDate])

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0)
    const refresh = () => void load()
    window.addEventListener('sah:activity-changed', refresh)
    return () => {
      window.clearTimeout(initial)
      window.removeEventListener('sah:activity-changed', refresh)
    }
  }, [load])

  return { ...state, refresh: load }
}

export function notifyActivityChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('sah:activity-changed'))
}
