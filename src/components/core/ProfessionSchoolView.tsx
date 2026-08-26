'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { PROFESSION_LESSONS, PROFESSION_TRACKS, professionProgress, type ProfessionLesson, type ProfessionLessonContent, type ProfessionTrack } from '@/lib/professionSchool'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { isValidUUID, useJourneyStore } from '@/store/useJourneyStore'
import type { Json } from '@/types/database'

type Progress = { lessonId: string; reflectionNote: string | null; completedAt: string }

const isLessonContent = (value: Json): value is ProfessionLessonContent => Boolean(
  value && typeof value === 'object' && !Array.isArray(value)
  && typeof value.openingType === 'string' && typeof value.openingText === 'string'
  && typeof value.explanation === 'string' && typeof value.action === 'string',
)

export default function ProfessionSchoolView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const user = useAuthStore((state) => state.user)
  const journey = useJourneyStore()
  const [tracks, setTracks] = useState<ProfessionTrack[]>(PROFESSION_TRACKS)
  const [lessons, setLessons] = useState<ProfessionLesson[]>(PROFESSION_LESSONS)
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<Map<string, Progress>>(new Map())
  const [activeTrackId, setActiveTrackId] = useState<string>('')
  const [activeLesson, setActiveLesson] = useState<ProfessionLesson | null>(null)
  const [reflection, setReflection] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([
      supabase.from('profession_tracks').select('*').order('profession_name'),
      supabase.from('profession_lessons').select('*').order('order_index'),
      supabase.from('user_profession_tracks').select('track_id'),
      supabase.from('user_lesson_progress').select('lesson_id, reflection_note, completed_at'),
    ]).then(([trackResult, lessonResult, followResult, progressResult]) => {
      if (!active) return
      if (trackResult.data?.length === PROFESSION_TRACKS.length) setTracks(trackResult.data.map((item) => ({ id: item.id, professionName: item.profession_name, icon: item.icon, description: item.description, colorAccent: item.color_accent })))
      if (lessonResult.data?.length === PROFESSION_LESSONS.length) {
        const mapped = lessonResult.data.flatMap((item) => {
          const content = item.content_body as Json
          if (!isLessonContent(content) || !Array.isArray(item.source_references)) return []
          return [{ id: item.id, trackId: item.track_id, title: item.title, orderIndex: item.order_index, durationEstimateMinutes: item.duration_estimate_minutes, content, sourceReferences: item.source_references as unknown as ProfessionLesson['sourceReferences'], xpReward: item.xp_reward }]
        })
        if (mapped.length === PROFESSION_LESSONS.length) setLessons(mapped)
      }
      const followedIds = new Set((followResult.data ?? []).map((item) => item.track_id))
      setFollowed(followedIds)
      setActiveTrackId(followedIds.values().next().value || '')
      setProgress(new Map((progressResult.data ?? []).map((item) => [item.lesson_id, { lessonId: item.lesson_id, reflectionNote: item.reflection_note, completedAt: item.completed_at }])))
    })
    return () => { active = false }
  }, [])

  const completedIds = useMemo(() => new Set(progress.keys()), [progress])
  const activeTrack = tracks.find((track) => track.id === activeTrackId)
  const activeTrackLessons = lessons.filter((lesson) => lesson.trackId === activeTrackId).sort((a, b) => a.orderIndex - b.orderIndex)
  const overall = followed.size ? Math.round([...followed].reduce((sum, id) => {
    const trackLessons = lessons.filter((lesson) => lesson.trackId === id)
    return sum + (trackLessons.length ? trackLessons.filter((lesson) => completedIds.has(lesson.id)).length / trackLessons.length : 0)
  }, 0) / followed.size * 100) : 0

  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3600) }
  const follow = async (trackId: string) => {
    if (followed.has(trackId)) { setActiveTrackId(trackId); return }
    const isDemo = !user?.id || !isValidUUID(user.id)
    if (!isDemo) {
      const { error } = await supabase.from('user_profession_tracks').upsert({ user_id: user.id, track_id: trackId }, { onConflict: 'user_id,track_id' })
      if (error) { flash('Alan eklenemedi. Bağlantını kontrol edip yeniden dene.'); return }
    }
    setFollowed((current) => new Set(current).add(trackId)); setActiveTrackId(trackId); flash('Meslek yolu çalışma alanına eklendi.')
  }
  const openLesson = (lesson: ProfessionLesson, unlocked: boolean) => {
    if (!unlocked) { flash('Bu ders, önceki adımı tamamladığında açılacak.'); return }
    setActiveLesson(lesson); setReflection(progress.get(lesson.id)?.reflectionNote || '')
  }
  const complete = async () => {
    if (!activeLesson || saving || completedIds.has(activeLesson.id)) return
    setSaving(true)
    const isDemo = !user?.id || !isValidUUID(user.id)
    let awarded = isDemo
    let trackCompleted = false
    if (!isDemo) {
      const { data, error } = await supabase.rpc('complete_profession_lesson', { target_lesson_id: activeLesson.id, reflection_text: reflection.trim() || null })
      if (error) { setSaving(false); flash('Ders kaydedilemedi. Lütfen yeniden dene.'); return }
      const result = Array.isArray(data) ? data[0] : data
      awarded = Boolean(result?.awarded)
      trackCompleted = Boolean(result?.track_completed)
    }
    const completedAt = new Date().toISOString()
    setProgress((current) => new Map(current).set(activeLesson.id, { lessonId: activeLesson.id, reflectionNote: reflection.trim() || null, completedAt }))
    window.dispatchEvent(new Event('sah:activity-changed'))
    if (awarded) {
      journey.addXP(activeLesson.xpReward); journey.updateStreak()
    }
    setSaving(false)
    flash(trackCompleted ? `Meslek Ahlakı rozeti açıldı · +${activeLesson.xpReward} XH` : awarded ? `Ders tamamlandı · +${activeLesson.xpReward} XH` : 'Ders daha önce tamamlanmıştı.')
    window.setTimeout(() => setActiveLesson(null), 650)
  }

  return <div className="view-stack profession-school">
    <header className="profession-hero">
      <div><span className="profession-kicker"><AppIcon name="certificate" /> MESLEK · EMANET · İHSAN</span><h1>Meslek ve Ahlak Okulu</h1><p>Teknik yetkinliği niyet, emanet, doğruluk ve adaletle aynı çalışma disiplininde buluşturan kısa öğrenme yolları.</p></div>
      <div className="profession-hero-metrics"><article><strong>{followed.size}</strong><span>Takip edilen yol</span></article><article><strong>{completedIds.size}</strong><span>Tamamlanan ders</span></article><article><strong>%{overall}</strong><span>Genel ilerleme</span></article></div>
    </header>

    {notice && <div className="profession-notice" role="status"><AppIcon name="circle-check" /> {notice}</div>}

    <section className="profession-selector" aria-labelledby="profession-select-title">
      <header><div><span className="eyebrow">KİŞİSEL ÖĞRENME ALANIN</span><h2 id="profession-select-title">Meslek seç</h2><p>Birden fazla yolu takip edebilir, her birinde kaldığın yerden devam edebilirsin.</p></div></header>
      <div className="profession-track-grid">{tracks.map((track) => {
        const lessonSet = lessons.filter((lesson) => lesson.trackId === track.id)
        const completed = lessonSet.filter((lesson) => completedIds.has(lesson.id)).length
        const percent = lessonSet.length ? Math.round(completed / lessonSet.length * 100) : 0
        const isFollowed = followed.has(track.id)
        return <button key={track.id} className={`${isFollowed ? 'is-followed' : ''} ${activeTrackId === track.id ? 'is-active' : ''}`} style={{ '--track-accent': track.colorAccent } as React.CSSProperties} onClick={() => void follow(track.id)}>
          <span className="track-icon"><AppIcon name={track.icon} /></span><span className="track-copy"><strong>{track.professionName}</strong><small>{track.description}</small></span><span className="track-progress"><i><b style={{ width: `${percent}%` }} /></i><em>{isFollowed ? `%${percent}` : 'Yolu ekle'}</em></span>
        </button>
      })}</div>
    </section>

    {activeTrack ? <section className="profession-learning-shell" style={{ '--track-accent': activeTrack.colorAccent } as React.CSSProperties}>
      <aside className="profession-course-summary"><span className="track-icon"><AppIcon name={activeTrack.icon} /></span><p className="eyebrow">AKTİF ÖĞRENME YOLU</p><h2>{activeTrack.professionName}</h2><p>{activeTrack.description}</p>{(() => { const value = professionProgress(completedIds, activeTrack.id); return <><div className="course-progress"><span><b style={{ width: `${value.percent}%` }} /></span><strong>%{value.percent}</strong></div><small>{value.completed}/{value.total} ders · Her ders 30 XH</small></> })()}<div className="course-principles"><span>Niyet</span><span>Emanet</span><span>İhsan</span><span>Adalet</span></div></aside>
      <div className="lesson-path" aria-label={`${activeTrack.professionName} ders yolu`}>{activeTrackLessons.map((lesson, index) => {
        const done = completedIds.has(lesson.id)
        const unlocked = index === 0 || completedIds.has(activeTrackLessons[index - 1].id)
        return <motion.button key={lesson.id} className={`${done ? 'is-complete' : unlocked ? 'is-unlocked' : 'is-locked'} path-side-${index % 3}`} onClick={() => openLesson(lesson, unlocked)} whileHover={unlocked ? { y: -2 } : undefined} aria-label={`${lesson.orderIndex}. ders: ${lesson.title} · ${done ? 'tamamlandı' : unlocked ? 'açık' : 'kilitli'}`}>
          <span className="path-node">{done ? <AppIcon name="check" /> : unlocked ? lesson.orderIndex : <AppIcon name="lock" />}</span><span className="path-label"><small>{lesson.durationEstimateMinutes} DK · {lesson.orderIndex <= 5 ? 'ORTAK TEMEL' : 'MESLEĞE ÖZEL'}</small><strong>{lesson.title}</strong></span>
        </motion.button>
      })}</div>
    </section> : <section className="profession-empty"><AppIcon name="route" /><h2>İlk öğrenme yolunu seç</h2><p>Yukarıdaki meslek kartlarından birini eklediğinde sekiz adımlı ders yolu burada açılacak.</p></section>}

    <div className="context-links"><span><AppIcon name="link" /> Öğrendiğini günlük hayata taşı</span><div><button type="button" onClick={() => onNavigate('journal')}><AppIcon name="notebook" /> Ders üzerine günlük notu yaz<AppIcon name="arrow-right" /></button><button type="button" onClick={() => onNavigate('matrix')}><AppIcon name="layout-grid" /> Uygulama adımını planla<AppIcon name="arrow-right" /></button></div></div>

    <AnimatePresence>{activeLesson && <motion.div className="lesson-reader-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && setActiveLesson(null)}>
      <motion.article className="lesson-reader" role="dialog" aria-modal="true" aria-labelledby="lesson-reader-title" initial={{ opacity: 0, y: 22, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .99 }}>
        <button className="lesson-close" onClick={() => setActiveLesson(null)} aria-label="Dersi kapat"><AppIcon name="x" /></button>
        <header><span className="eyebrow">{activeTrack?.professionName.toLocaleUpperCase('tr-TR')} · DERS {activeLesson.orderIndex}</span><h2 id="lesson-reader-title">{activeLesson.title}</h2><p><AppIcon name="clock" /> {activeLesson.durationEstimateMinutes} dakika <span>·</span> +{activeLesson.xpReward} XH</p></header>
        <blockquote className="lesson-opening">{activeLesson.content.openingArabic && <span lang="ar" dir="rtl">{activeLesson.content.openingArabic}</span>}<p>“{activeLesson.content.openingText}”</p><small>{activeLesson.content.openingType === 'ayet' ? 'Kur’an-ı Kerim' : 'Hadis-i şerif'}</small></blockquote>
        <section className="lesson-explanation"><p className="eyebrow">MESLEKTEKİ KARŞILIĞI</p><p>{activeLesson.content.explanation}</p></section>
        <section className="lesson-action"><AppIcon name="target-arrow" /><div><small>BUGÜN NASIL UYGULARSIN?</small><p>{activeLesson.content.action}</p></div></section>
        <section className="lesson-sources"><p className="eyebrow">DOĞRULANMIŞ KAYNAK</p>{activeLesson.sourceReferences.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"><AppIcon name="external-link" /> {source.label}</a>)}</section>
        <label className="lesson-reflection"><span>Kısa tefekkür notun <small>İsteğe bağlı · yalnızca sana görünür</small></span><textarea rows={3} maxLength={600} value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="Bu dersten işime taşıyacağım şey…" disabled={completedIds.has(activeLesson.id)} /></label>
        <button className="primary-button lesson-complete" onClick={() => void complete()} disabled={saving || completedIds.has(activeLesson.id)}>{completedIds.has(activeLesson.id) ? <><AppIcon name="circle-check-filled" /> Tamamlandı</> : saving ? 'Kaydediliyor…' : <><AppIcon name="check" /> Tamamladım · +{activeLesson.xpReward} XH</>}</button>
      </motion.article>
    </motion.div>}</AnimatePresence>
  </div>
}
