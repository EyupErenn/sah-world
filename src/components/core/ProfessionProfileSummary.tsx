'use client'

import { useEffect, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { supabase } from '@/lib/supabase'

export default function ProfessionProfileSummary({ onOpen }: { onOpen: () => void }) {
  const [summary, setSummary] = useState({ lessons: 0, completedTracks: 0 })

  useEffect(() => {
    let active = true
    void Promise.all([
      supabase.from('user_lesson_progress').select('lesson_id'),
      supabase.from('profession_lessons').select('id, track_id'),
    ]).then(([progressResult, lessonResult]) => {
      if (!active) return
      const completedIds = new Set((progressResult.data ?? []).map((item) => item.lesson_id))
      const byTrack = new Map<string, string[]>()
      for (const lesson of lessonResult.data ?? []) byTrack.set(lesson.track_id, [...(byTrack.get(lesson.track_id) ?? []), lesson.id])
      const completedTracks = [...byTrack.values()].filter((ids) => ids.length > 0 && ids.every((id) => completedIds.has(id))).length
      setSummary({ lessons: completedIds.size, completedTracks })
    })
    return () => { active = false }
  }, [])

  return <button className="profession-profile-summary" role="menuitem" onClick={onOpen}>
    <span><AppIcon name="certificate" /></span>
    <span><strong>Meslek Ahlakı</strong><small>{summary.lessons} ders · {summary.completedTracks} tamamlanan yol</small></span>
    {summary.completedTracks > 0 ? <AppIcon name="rosette-discount-check-filled" /> : <AppIcon name="chevron-right" />}
  </button>
}
