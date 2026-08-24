'use client'

import { useEffect, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { supabase } from '@/lib/supabase'

export default function AwarenessProfileSummary({ onOpen }: { onOpen: () => void }) {
  const [summary, setSummary] = useState({ sections: 0, quizzes: 0 })

  useEffect(() => {
    let active = true
    void Promise.all([
      supabase.from('awareness_engagement_log').select('id', { count: 'exact', head: true }).eq('event_type', 'section_read'),
      supabase.from('user_quiz_attempts').select('geography'),
    ]).then(([sections, quizzes]) => {
      if (!active) return
      setSummary({ sections: sections.count ?? 0, quizzes: new Set((quizzes.data ?? []).map((item) => item.geography)).size })
    })
    return () => { active = false }
  }, [])

  return <button className="awareness-profile-summary" role="menuitem" onClick={onOpen}>
    <span><AppIcon name="world-heart" /></span>
    <span><strong>Öğrendiklerin</strong><small>{summary.sections} kaynak bölümü · {summary.quizzes}/2 test</small></span>
    <AppIcon name="chevron-right" />
  </button>
}
