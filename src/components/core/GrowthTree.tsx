'use client'

import { useEffect, useMemo, useState } from 'react'
import { buildGrowthSceneData } from '@/lib/growthScene'
import type { ActivityEvent } from '@/lib/activity'
import GrowthScene from './GrowthScene'

export type GrowthNavigationCue = {
  source: 'growth-diagram'
  accent: string
  icon: string
  label: string
}

/** Adapter to the existing store and activity feed; no second source of XP truth. */
export default function GrowthTree({ xp, events, onNavigate, loading = false }: {
  xp: number
  trigger: number
  lastAmount: number
  events: ActivityEvent[]
  loading?: boolean
  onNavigate: (view: string, cue?: GrowthNavigationCue) => void
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const refresh = () => { if (!document.hidden) setNow(Date.now()) }
    const interval = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  // A newly received record must not wait for the previous minute's clock.
  useEffect(() => {
    const refresh = window.setTimeout(() => setNow(Date.now()), 0)
    return () => window.clearTimeout(refresh)
  }, [events])
  const data = useMemo(() => buildGrowthSceneData(xp, events, now), [xp, events, now])
  return <GrowthScene data={data} events={events} loading={loading} now={now} onNavigate={onNavigate} />
}
