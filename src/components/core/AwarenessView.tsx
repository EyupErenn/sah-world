'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { useAuthStore } from '@/store/useAuthStore'
import { useJourneyStore } from '@/store/useJourneyStore'
import { supabase } from '@/lib/supabase'
import { recordXpEvent } from '@/lib/xp'
import {
  AWARENESS_ACTIONS,
  AWARENESS_CONTENT_FALLBACK,
  AWARENESS_QUIZ_FALLBACK,
  GEOGRAPHY_META,
  quizReward,
  type AwarenessContent,
  type AwarenessQuizQuestion,
  type Geography,
  type QuizOption,
} from '@/lib/awareness'

type Panel = 'learn' | 'act' | 'quiz'
type EngagementType = 'section_read' | 'action_opened' | 'quiz_completed'

const isApprovedSource = (url: string | null | undefined) => Boolean(
  url && (url.startsWith('https://www.dijitalhafiza.com/')
    || url.startsWith('https://doguturkistan.dijitalhafiza.com/')
    || url.startsWith('https://www.trthaber.com/')),
)

export default function AwarenessView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const user = useAuthStore((state) => state.user)
  const [geography, setGeography] = useState<Geography>('filistin')
  const [panel, setPanel] = useState<Panel>('learn')
  const [content, setContent] = useState(AWARENESS_CONTENT_FALLBACK)
  const [questions, setQuestions] = useState(AWARENESS_QUIZ_FALLBACK)
  const [completed, setCompleted] = useState<Set<Geography>>(new Set())
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    let active = true
    const load = async () => {
      const [contentResult, questionResult, attemptResult, engagementResult] = await Promise.all([
        // order_index exists in both the legacy and source-reviewed schemas. This
        // keeps the audited fallback usable before migration 010 is applied.
        supabase.from('regional_awareness_content').select('*').eq('is_published', true).order('order_index'),
        supabase.from('awareness_quiz_questions').select('*').order('order_index'),
        supabase.from('user_quiz_attempts').select('geography'),
        supabase.from('awareness_engagement_log').select('geography, content_id, event_type').eq('event_type', 'section_read'),
      ])
      if (!active) return
      const reviewedContent = (contentResult.data ?? []).filter((item) => (
        Boolean(item.section_title && item.content_body && item.source_name)
        && Number.isFinite(item.display_order)
        && isApprovedSource(item.source_url)
      ))
      const hasCompleteReviewedJourney = reviewedContent.length === AWARENESS_CONTENT_FALLBACK.length
        && (['filistin', 'dogu-turkistan'] as Geography[]).every((key) => reviewedContent.filter((item) => item.geography === key).length === 6)
      if (hasCompleteReviewedJourney) {
        setContent(reviewedContent.map((item) => ({
          id: item.id,
          geography: item.geography,
          section: item.section,
          sectionTitle: item.section_title,
          contentBody: item.content_body,
          sourceName: item.source_name,
          sourceUrl: item.source_url,
          displayOrder: item.display_order,
          actionCue: item.action_cue,
        })))
      }
      const reviewedQuestions = (questionResult.data ?? []).filter((item) => isApprovedSource(item.source_url))
      if (reviewedQuestions.length === AWARENESS_QUIZ_FALLBACK.length) setQuestions(reviewedQuestions.map((item) => ({ id: item.id, geography: item.geography, questionText: item.question_text, options: { A: item.option_a, B: item.option_b, C: item.option_c, D: item.option_d }, correctOption: item.correct_option, explanationText: item.explanation_text, orderIndex: item.order_index, sourceUrl: item.source_url })))
      if (attemptResult.data) setCompleted(new Set(attemptResult.data.map((item) => item.geography)))
      if (engagementResult.data) setReadKeys(new Set(engagementResult.data.map((item) => `${item.geography}:${item.content_id}`)))
    }
    void load()
    return () => { active = false }
  }, [])

  const logEngagement = useCallback(async (eventType: EngagementType, targetGeography: Geography, contentId: string, metadata: Record<string, string | number | boolean> = {}) => {
    if (!user) return
    if (eventType === 'section_read') setReadKeys((current) => new Set(current).add(`${targetGeography}:${contentId}`))
    await supabase.from('awareness_engagement_log').upsert({
      user_id: user.id,
      geography: targetGeography,
      content_id: contentId,
      event_type: eventType,
      metadata,
    }, { onConflict: 'user_id,geography,content_id,event_type' })
  }, [user])

  const changeGeography = (next: Geography) => { setGeography(next); setPanel('learn') }
  const meta = GEOGRAPHY_META[geography]
  const geographyItems = content.filter((item) => item.geography === geography)
  const readCount = geographyItems.filter((item) => readKeys.has(`${geography}:${item.id}`)).length

  return <div className="view-stack awareness-view">
    <header className="awareness-hero">
      <div className="awareness-hero-copy"><span className="awareness-kicker"><AppIcon name="world-heart" /> HAFIZA · HAKİKAT · SORUMLULUK</span><h1>Mazlum Coğrafyalar</h1><p>Acıyı tüketilecek bir içerik hâline getirmeden; tarihi, tanıklığı ve kaynağı birlikte okuyan ciddi bir öğrenme alanı.</p></div>
      <div className="awareness-hero-art" aria-hidden><span className="orbit orbit-one" /><span className="orbit orbit-two" /><i className="hero-star star-one" /><i className="hero-star star-two" /><strong>Bilgi<br/>sorumluluk<br/>doğurur</strong></div>
    </header>

    <div className="geography-switcher" aria-label="Coğrafya seçimi">
      {(Object.keys(GEOGRAPHY_META) as Geography[]).map((key) => <button key={key} className={geography === key ? 'active' : ''} onClick={() => changeGeography(key)}><span style={{ background: `${GEOGRAPHY_META[key].accent}12`, color: GEOGRAPHY_META[key].accent }}><AppIcon name={GEOGRAPHY_META[key].icon} /></span><div><strong>{GEOGRAPHY_META[key].name}</strong><small>{GEOGRAPHY_META[key].short}</small></div><AppIcon name="chevron-right" /></button>)}
    </div>

    <section className="awareness-shell" style={{ '--awareness-accent': meta.accent } as React.CSSProperties}>
      <header className="awareness-section-head"><div><span className="eyebrow">{meta.name.toLocaleUpperCase('tr-TR')}</span><h2>{meta.short}</h2><p className="awareness-reading-progress"><span><i style={{ width: `${geographyItems.length ? (readCount / geographyItems.length) * 100 : 0}%` }} /></span>{readCount}/{geographyItems.length} bölüm okundu</p></div><nav aria-label={`${meta.name} bölümleri`}><button className={panel === 'learn' ? 'active' : ''} onClick={() => setPanel('learn')}>Ne oluyor / Gerçekler</button><button className={panel === 'act' ? 'active' : ''} onClick={() => setPanel('act')}>Ne yapabiliriz?</button><button className={panel === 'quiz' ? 'active' : ''} onClick={() => setPanel('quiz')}>Bilgi testi</button></nav></header>
      <AnimatePresence mode="wait"><motion.div key={`${geography}-${panel}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .2 }}>
        {panel === 'learn' && <LearningPanel geography={geography} content={geographyItems} readKeys={readKeys} onRead={(item) => void logEngagement('section_read', geography, item.id, { source_url: item.sourceUrl })} onAct={() => setPanel('act')} />}
        {panel === 'act' && <ActionPanel geography={geography} onNavigate={onNavigate} onQuiz={() => setPanel('quiz')} onAction={(href) => void logEngagement('action_opened', geography, href, { source_url: href })} />}
        {panel === 'quiz' && <Quiz geography={geography} questions={questions.filter((item) => item.geography === geography).sort((a, b) => a.orderIndex - b.orderIndex)} rewarded={completed.has(geography)} onRewarded={() => setCompleted((items) => new Set(items).add(geography))} onCompleted={(score) => void logEngagement('quiz_completed', geography, `quiz:${geography}`, { score })} />}
      </motion.div></AnimatePresence>
    </section>

    <div className="context-links"><span><AppIcon name="link" /> Bilgiyi iç muhasebeye dönüştür</span><div><button type="button" onClick={() => onNavigate('journal')}><AppIcon name="notebook" /> Bugün öğrendiğimi günlüğe yaz<AppIcon name="arrow-right" /></button><button type="button" onClick={() => onNavigate('mescidim')}><AppIcon name="building-mosque" /> Dua ve tefekküre geç<AppIcon name="arrow-right" /></button></div></div>

    <footer className="awareness-editorial-note"><AppIcon name="shield-check" /><div><strong>Kaynak ve dil ilkesi</strong><p>Faktüel özetler yalnızca Dijital Hafıza ve TRT Haber’de erişilen sayfalara dayanır. Her iddianın kaynağı hemen altında görünür; tanık ve kurum açıklamaları kendi sahiplerine açıkça atfedilir. Grafik görüntü kullanılmaz.</p></div></footer>
  </div>
}

function LearningPanel({ geography, content, readKeys, onRead, onAct }: { geography: Geography; content: AwarenessContent[]; readKeys: Set<string>; onRead: (item: AwarenessContent) => void; onAct: () => void }) {
  const items = [...content].sort((a, b) => a.displayOrder - b.displayOrder)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(items[0] ? [items[0].id] : []))

  const reveal = (item: AwarenessContent) => {
    setExpanded((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next })
    onRead(item)
  }
  const continueTo = (item: AwarenessContent, next?: AwarenessContent) => {
    onRead(item)
    if (next) {
      setExpanded((current) => new Set(current).add(next.id))
      window.setTimeout(() => document.getElementById(`awareness-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
    } else onAct()
  }

  if (!items.length) return <div className="empty-state"><i><AppIcon name="cloud-off" /></i><strong>Kaynak incelemesi sürüyor</strong><p>Doğrulanmamış içerik göstermek yerine bu alan kaynak onayını bekliyor.</p></div>
  return <div className="awareness-journey">{items.map((item, index) => {
    const isOpen = expanded.has(item.id)
    const isRead = readKeys.has(`${geography}:${item.id}`)
    return <article key={item.id} id={`awareness-${item.id}`} className={`awareness-step ${isOpen ? 'is-open' : ''} ${isRead ? 'is-read' : ''}`}>
      <button className="awareness-step-trigger" onClick={() => reveal(item)} aria-expanded={isOpen} aria-controls={`awareness-body-${item.id}`}>
        <span className="story-number">{String(index + 1).padStart(2, '0')}</span><span><small>{sectionLabel(item.section)}</small><strong>{item.sectionTitle}</strong></span><i>{isRead ? <AppIcon name="circle-check-filled" /> : <AppIcon name={isOpen ? 'chevron-up' : 'chevron-down'} />}</i>
      </button>
      <AnimatePresence initial={false}>{isOpen && <motion.div id={`awareness-body-${item.id}`} className="awareness-step-body" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
        <p>{item.contentBody}</p>
        <div className="awareness-source-row"><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={() => onRead(item)}><span>Kaynak</span><strong>{item.sourceName}</strong><AppIcon name="external-link" /></a></div>
        <div className="awareness-action-cue"><AppIcon name="heart-handshake" /><div><small>ŞİMDİ NE YAPABİLİRSİN?</small><p>{item.actionCue}</p></div></div>
        <button className="awareness-continue" onClick={() => continueTo(item, items[index + 1])}>{items[index + 1] ? 'Sonraki bölüme geç' : 'Yapabileceklerime geç'} <AppIcon name="arrow-down" /></button>
      </motion.div>}</AnimatePresence>
    </article>
  })}</div>
}

function sectionLabel(section: AwarenessContent['section']) {
  return ({ history: 'TARİHSEL ARKA PLAN', displacement: 'YERİNDEN EDİLME', today: 'BUGÜN', detention: 'GÖZALTI VE MAHPUSLAR', culture: 'KİMLİK VE KÜLTÜR', solidarity: 'SEBAT VE DAYANIŞMA' } as const)[section]
}

function ActionPanel({ geography, onNavigate, onQuiz, onAction }: { geography: Geography; onNavigate: (view: string) => void; onQuiz: () => void; onAction: (href: string) => void }) {
  return <div className="awareness-actions"><div className="action-grid">{AWARENESS_ACTIONS[geography].map((item) => <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => onAction(item.href)}><span><AppIcon name={item.icon} /></span><h3>{item.title}</h3><p>{item.body}</p><strong>Kaynağı aç <AppIcon name="external-link" /></strong></a>)}<button className="awareness-action-card prayer" onClick={() => onNavigate('mescidim')}><span><AppIcon name="building-mosque" /></span><h3>Dua ve tefekkür alanı aç</h3><p>Bilgiyi aceleci tepkiye değil; dua, sabır ve sorumlu davranışa dönüştürmek için kısa bir durak ver.</p><strong>Mescidim’e git <AppIcon name="arrow-right" /></strong></button></div><div className="quiz-callout"><span><AppIcon name="bulb" /></span><div><p className="eyebrow">ÖĞRENDİĞİNİ KAYNAĞIYLA HATIRLA</p><h3>10 soruluk bilgi testine hazır mısın?</h3><p>Her cevapta kısa açıklama ve doğrudan kaynak bağlantısı göreceksin.</p></div><button className="primary-button" onClick={onQuiz}>Teste başla <AppIcon name="arrow-right" /></button></div></div>
}

function Quiz({ geography, questions, rewarded, onRewarded, onCompleted }: { geography: Geography; questions: AwarenessQuizQuestion[]; rewarded: boolean; onRewarded: () => void; onCompleted: (score: number) => void }) {
  const addXP = useJourneyStore((state) => state.addXP)
  const user = useAuthStore((state) => state.user)
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<QuizOption | null>(null)
  const [done, setDone] = useState(false)
  const [notice, setNotice] = useState('')
  const [wasRewarded] = useState(rewarded)
  const [awardedThisRun, setAwardedThisRun] = useState(false)
  const question = questions[index]
  const meta = GEOGRAPHY_META[geography]
  const reward = quizReward(score)
  const options = useMemo(() => ['A', 'B', 'C', 'D'] as QuizOption[], [])

  if (!question) return <div className="empty-state"><i><AppIcon name="cloud-off" /></i><strong>Sorular kaynak onayını bekliyor</strong><p>Doğrulanmamış soru göstermek yerine test geçici olarak kapalı tutuluyor.</p></div>

  const answer = (option: QuizOption) => { if (selected) return; setSelected(option); if (option === question.correctOption) setScore((value) => value + 1) }
  const next = async () => {
    if (index < questions.length - 1) { setIndex((value) => value + 1); setSelected(null); return }
    const finalScore = score
    setDone(true)
    onCompleted(finalScore)
    const earned = quizReward(finalScore)
    if (!wasRewarded) {
      addXP(earned); setAwardedThisRun(true); onRewarded()
      const attemptId = crypto.randomUUID()
      await Promise.all([
        user ? supabase.from('user_quiz_attempts').insert({ id: attemptId, user_id: user.id, geography, score: finalScore, xh_awarded: earned }) : Promise.resolve(),
        recordXpEvent({ sourceType: 'awareness_quiz', sourceId: attemptId, label: `${meta.name} bilgi testi`, amount: earned }),
      ])
    } else if (user) await supabase.from('user_quiz_attempts').insert({ user_id: user.id, geography, score: finalScore, xh_awarded: 0 })
  }
  const retry = () => { setIndex(0); setScore(0); setSelected(null); setDone(false); setNotice(''); setAwardedThisRun(false) }
  const share = async () => {
    const text = `SAH World ${meta.name} bilgi testinde ${score}/10 doğru yaptım. Kaynaklı öğrenme yolculuğuna sen de katıl.`
    try { if (navigator.share) await navigator.share({ title: 'SAH World · Mazlum Coğrafyalar', text, url: window.location.href }); else { await navigator.clipboard.writeText(`${text} ${window.location.href}`); setNotice('Sonuç bağlantısı panoya kopyalandı.') } } catch { /* Kullanıcının paylaşım penceresini kapatması hata değildir. */ }
  }

  if (done) return <div className="quiz-result"><span className="result-orbit"><AppIcon name={score >= 8 ? 'rosette-discount-check' : 'sparkles'} /></span><p className="eyebrow">{meta.name.toLocaleUpperCase('tr-TR')} · TEST TAMAMLANDI</p><h3>{score}/10 doğru</h3><p>{score >= 8 ? 'Kaynakları dikkatle takip ettin. Şimdi bu bilgiyi sakin, özenli ve doğrulanabilir biçimde paylaşabilirsin.' : 'Açıklamaları ve kaynakları yeniden inceleyerek bilgi zincirini güçlendirebilirsin.'}</p><div className="quiz-reward"><span><AppIcon name="sparkles" /></span><div><strong>{awardedThisRun ? `+${reward} XH kazandın` : 'Bu tur öğrenme amaçlıydı'}</strong><small>{awardedThisRun ? `40 tamamlama XH’si + ${score * 5} doğru cevap XH’si` : 'XH ödülü her coğrafyada yalnızca ilk tamamlamada verilir.'}</small></div></div><div className="result-actions"><button className="primary-button" onClick={() => void share()}><AppIcon name="share-3" /> Sonucu paylaş</button><button className="ghost-button" onClick={retry}><AppIcon name="refresh" /> Yeniden dene</button></div>{notice && <p className="inline-notice">{notice}</p>}</div>

  const answeredCorrectly = selected === question.correctOption
  return <div className="quiz-layout"><aside><span className="quiz-index">{String(index + 1).padStart(2, '0')}<small>/10</small></span><div className="quiz-progress"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div><p><strong>{score}</strong> doğru cevap</p><small>Her sorudan sonra açıklamayı ve kaynağı incele.</small></aside><section className="quiz-card"><header><span>{meta.name} bilgi testi</span><span>{index + 1} / {questions.length}</span></header><h3>{question.questionText}</h3><div className="quiz-options">{options.map((option) => { const isCorrect = selected && option === question.correctOption; const isWrong = selected === option && option !== question.correctOption; return <button key={option} className={`${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`} onClick={() => answer(option)} disabled={Boolean(selected)}><b>{option}</b><span>{question.options[option]}</span>{isCorrect && <AppIcon name="circle-check-filled" />}{isWrong && <AppIcon name="circle-x-filled" />}</button> })}</div>{selected && <motion.div className={`answer-explanation ${answeredCorrectly ? 'correct' : 'learn'}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}><span><AppIcon name={answeredCorrectly ? 'circle-check' : 'bulb'} /></span><div><strong>{answeredCorrectly ? 'Doğru cevap' : `Doğru cevap: ${question.correctOption}`}</strong><p>{question.explanationText}</p><a href={question.sourceUrl} target="_blank" rel="noopener noreferrer">Kaynağı incele <AppIcon name="external-link" /></a></div></motion.div>}<footer><span>{wasRewarded ? 'Tekrar turu · XH ödülü verilmez' : 'İlk tamamlama ödülü: 40 + doğru başına 5 XH'}</span><button className="primary-button" disabled={!selected} onClick={() => void next()}>{index === questions.length - 1 ? 'Sonucu gör' : 'Sonraki soru'} <AppIcon name="arrow-right" /></button></footer></section></div>
}
