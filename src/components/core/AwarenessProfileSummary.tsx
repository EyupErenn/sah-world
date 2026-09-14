'use client'

import { useEffect, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { supabase } from '@/lib/supabase'

export default function AwarenessProfileSummary({ onOpen }: { onOpen: () => void }) {
  const [summary, setSummary] = useState({ sections: 0, narratives: 0, quizzes: 0, shares: 0 })

  useEffect(() => {
    let active = true
    void Promise.all([
      supabase.from('awareness_engagement_log').select('geography, event_type').in('event_type', ['section_read', 'narrative_completed', 'shared']),
      supabase.from('user_quiz_attempts').select('geography'),
    ]).then(([engagement, quizzes]) => {
      if (!active) return
      const events = engagement.data ?? []
      setSummary({
        sections: events.filter((item) => item.event_type === 'section_read').length,
        narratives: new Set(events.filter((item) => item.event_type === 'narrative_completed').map((item) => item.geography)).size,
        quizzes: new Set((quizzes.data ?? []).map((item) => item.geography)).size,
        shares: events.filter((item) => item.event_type === 'shared').length,
      })
    })
    return () => { active = false }
  }, [])

  return <button className="awareness-profile-summary" role="menuitem" onClick={onOpen}>
    <span><AppIcon name="world-heart" /></span>
    <span><strong>Öğrendiklerin ve Yaptıkların</strong><small>{summary.narratives}/2 anlatı · {summary.quizzes}/2 test · {summary.shares} paylaşım</small><small>{summary.sections} kaynak bölümü incelendi</small></span>
    <AppIcon name="chevron-right" />
  </button>
}
