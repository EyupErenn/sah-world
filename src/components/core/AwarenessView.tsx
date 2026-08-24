'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
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

export default function AwarenessView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [geography, setGeography] = useState<Geography>('filistin')
  const [panel, setPanel] = useState<Panel>('learn')
  const [content, setContent] = useState(AWARENESS_CONTENT_FALLBACK)
  const [questions, setQuestions] = useState(AWARENESS_QUIZ_FALLBACK)
  const [completed, setCompleted] = useState<Set<Geography>>(new Set())

  useEffect(() => {
    let active = true
    const load = async () => {
      const [contentResult, questionResult, attemptResult] = await Promise.all([
        supabase.from('regional_awareness_content').select('*').eq('is_published', true).order('order_index'),
        supabase.from('awareness_quiz_questions').select('*').order('order_index'),
        supabase.from('user_quiz_attempts').select('geography'),
      ])
      if (!active) return
      if (contentResult.data?.length) setContent(contentResult.data.map((item) => ({ id: item.id, geography: item.geography, section: item.section, title: item.title, body: item.body, sourceLabel: item.source_label, sourceUrl: item.source_url, orderIndex: item.order_index })))
      if (questionResult.data?.length) setQuestions(questionResult.data.map((item) => ({ id: item.id, geography: item.geography, questionText: item.question_text, options: { A: item.option_a, B: item.option_b, C: item.option_c, D: item.option_d }, correctOption: item.correct_option, explanationText: item.explanation_text, orderIndex: item.order_index, sourceUrl: item.source_url })))
      if (attemptResult.data) setCompleted(new Set(attemptResult.data.map((item) => item.geography)))
    }
    void load()
    return () => { active = false }
  }, [])

  const changeGeography = (next: Geography) => { setGeography(next); setPanel('learn') }
  const meta = GEOGRAPHY_META[geography]

  return <div className="view-stack awareness-view">
    <header className="awareness-hero">
      <div className="awareness-hero-copy"><span className="awareness-kicker"><AppIcon name="world-heart" /> BİLGİ · EMPATİ · SORUMLULUK</span><h1>Mazlum Coğrafyalar</h1><p>İnsanları yalnızca acılarıyla değil; kültürleri, hafızaları ve onurlu yaşamlarıyla tanımak için sakin ve kaynaklı bir öğrenme alanı.</p></div>
      <div className="awareness-hero-art" aria-hidden><span className="orbit orbit-one" /><span className="orbit orbit-two" /><i className="hero-star star-one" /><i className="hero-star star-two" /><strong>İnsanlık<br/>ortak<br/>emanetimiz</strong></div>
    </header>

    <div className="geography-switcher" aria-label="Coğrafya seçimi">
      {(Object.keys(GEOGRAPHY_META) as Geography[]).map((key) => <button key={key} className={geography === key ? 'active' : ''} onClick={() => changeGeography(key)}><span style={{ background: `${GEOGRAPHY_META[key].accent}14`, color: GEOGRAPHY_META[key].accent }}><AppIcon name={GEOGRAPHY_META[key].icon} /></span><div><strong>{GEOGRAPHY_META[key].name}</strong><small>{GEOGRAPHY_META[key].short}</small></div><AppIcon name="chevron-right" /></button>)}
    </div>

    <section className="awareness-shell" style={{ '--awareness-accent': meta.accent } as React.CSSProperties}>
      <header className="awareness-section-head"><div><span className="eyebrow">{meta.name.toLocaleUpperCase('tr-TR')}</span><h2>{meta.short}</h2></div><nav aria-label={`${meta.name} bölümleri`}><button className={panel === 'learn' ? 'active' : ''} onClick={() => setPanel('learn')}>Ne oluyor / Gerçekler</button><button className={panel === 'act' ? 'active' : ''} onClick={() => setPanel('act')}>Ne yapabiliriz?</button><button className={panel === 'quiz' ? 'active' : ''} onClick={() => setPanel('quiz')}>Bilgi testi</button></nav></header>
      <AnimatePresence mode="wait"><motion.div key={`${geography}-${panel}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .2 }}>
        {panel === 'learn' && <LearningPanel geography={geography} content={content} />}
        {panel === 'act' && <ActionPanel geography={geography} onNavigate={onNavigate} onQuiz={() => setPanel('quiz')} />}
        {panel === 'quiz' && <Quiz geography={geography} questions={questions.filter((item) => item.geography === geography).sort((a, b) => a.orderIndex - b.orderIndex)} rewarded={completed.has(geography)} onRewarded={() => setCompleted((items) => new Set(items).add(geography))} />}
      </motion.div></AnimatePresence>
    </section>

    <footer className="awareness-editorial-note"><AppIcon name="shield-check" /><div><strong>Kaynak ve dil ilkesi</strong><p>Bu alan grafik görüntü, kışkırtıcı dil veya doğrulanmamış istatistik kullanmaz. Özetler başlangıç metnidir; yayımlanmadan önce alan uzmanı tarafından editöryal ve olgusal incelemeden geçirilmelidir.</p></div></footer>
  </div>
}

function LearningPanel({ geography, content }: { geography: Geography; content: AwarenessContent[] }) {
  const items = content.filter((item) => item.geography === geography).sort((a, b) => a.orderIndex - b.orderIndex)
  return <div className="awareness-content-grid">{items.map((item, index) => <article key={item.id} className={`awareness-story story-${index + 1}`}><span className="story-number">0{index + 1}</span><div><p className="eyebrow">{item.section === 'overview' ? 'ARKA PLAN' : item.section === 'heritage' ? 'KÜLTÜREL MİRAS' : 'BUGÜNÜ ANLAMAK'}</p><h3>{item.title}</h3><p>{item.body}</p><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceLabel}<AppIcon name="external-link" /></a></div></article>)}</div>
}

function ActionPanel({ geography, onNavigate, onQuiz }: { geography: Geography; onNavigate: (view: string) => void; onQuiz: () => void }) {
  return <div className="awareness-actions"><div className="action-grid">{AWARENESS_ACTIONS[geography].map((item) => <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer"><span><AppIcon name={item.icon} /></span><h3>{item.title}</h3><p>{item.body}</p><strong>Güvenilir kaynağı aç <AppIcon name="external-link" /></strong></a>)}<button className="awareness-action-card prayer" onClick={() => onNavigate('mescidim')}><span><AppIcon name="building-mosque" /></span><h3>Dua ve tefekkür alanı aç</h3><p>Gündelik akışın içinde, isimleri ve insan onurunu unutmadan kısa bir dua molası ver.</p><strong>Mescidim’e git <AppIcon name="arrow-right" /></strong></button></div><div className="quiz-callout"><span><AppIcon name="bulb" /></span><div><p className="eyebrow">ÖĞREN VE SEN DE BAŞKALARINA ÖĞRET</p><h3>10 soruluk bilgi testine hazır mısın?</h3><p>Her cevapta kısa bir açıklama ve doğrudan kaynak bağlantısı göreceksin.</p></div><button className="primary-button" onClick={onQuiz}>Teste başla <AppIcon name="arrow-right" /></button></div></div>
}

function Quiz({ geography, questions, rewarded, onRewarded }: { geography: Geography; questions: AwarenessQuizQuestion[]; rewarded: boolean; onRewarded: () => void }) {
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

  if (!question) return <div className="empty-state"><i><AppIcon name="cloud-off" /></i><strong>Sorular hazırlanıyor</strong><p>Veri tabanı bağlantısı tamamlandığında bilgi testi burada açılacak.</p></div>

  const answer = (option: QuizOption) => {
    if (selected) return
    setSelected(option)
    if (option === question.correctOption) setScore((value) => value + 1)
  }
  const next = async () => {
    if (index < questions.length - 1) { setIndex((value) => value + 1); setSelected(null); return }
    const finalScore = score + (selected === question.correctOption ? 0 : 0)
    setDone(true)
    const earned = quizReward(finalScore)
    if (!wasRewarded) {
      addXP(earned)
      setAwardedThisRun(true)
      onRewarded()
      const attemptId = crypto.randomUUID()
      await Promise.all([
        user ? supabase.from('user_quiz_attempts').insert({ id: attemptId, user_id: user.id, geography, score: finalScore, xh_awarded: earned }) : Promise.resolve(),
        recordXpEvent({ sourceType: 'awareness_quiz', sourceId: attemptId, label: `${meta.name} bilgi testi`, amount: earned }),
      ])
    } else if (user) {
      await supabase.from('user_quiz_attempts').insert({ user_id: user.id, geography, score: finalScore, xh_awarded: 0 })
    }
  }
  const retry = () => { setIndex(0); setScore(0); setSelected(null); setDone(false); setNotice(''); setAwardedThisRun(false) }
  const share = async () => {
    const text = `SAH World ${meta.name} bilgi testinde ${score}/10 doğru yaptım. Kaynaklı öğrenme yolculuğuna sen de katıl.`
    try {
      if (navigator.share) await navigator.share({ title: 'SAH World · Mazlum Coğrafyalar', text, url: window.location.href })
      else { await navigator.clipboard.writeText(`${text} ${window.location.href}`); setNotice('Sonuç bağlantısı panoya kopyalandı.') }
    } catch { /* Kullanıcının paylaşım penceresini kapatması hata değildir. */ }
  }

  if (done) return <div className="quiz-result"><span className="result-orbit"><AppIcon name={score >= 8 ? 'rosette-discount-check' : 'sparkles'} /></span><p className="eyebrow">{meta.name.toLocaleUpperCase('tr-TR')} · TEST TAMAMLANDI</p><h3>{score}/10 doğru</h3><p>{score >= 8 ? 'Kaynakları dikkatle takip ettin. Şimdi bu bilgiyi sakin, özenli ve doğrulanabilir biçimde paylaşabilirsin.' : 'Öğrenmek tek seferlik bir sonuç değil. Açıklamaları ve kaynakları yeniden inceleyerek ritmini güçlendirebilirsin.'}</p><div className="quiz-reward"><span><AppIcon name="sparkles" /></span><div><strong>{awardedThisRun ? `+${reward} XH kazandın` : 'Bu tur öğrenme amaçlıydı'}</strong><small>{awardedThisRun ? `40 tamamlanma XH’si + ${score * 5} doğru cevap XH’si` : 'XH ödülü her coğrafyada yalnızca ilk tamamlamada verilir.'}</small></div></div><div className="result-actions"><button className="primary-button" onClick={() => void share()}><AppIcon name="share-3" /> Sonucu paylaş</button><button className="ghost-button" onClick={retry}><AppIcon name="refresh" /> Yeniden dene</button></div>{notice && <p className="inline-notice">{notice}</p>}</div>

  const answeredCorrectly = selected === question.correctOption
  return <div className="quiz-layout"><aside><span className="quiz-index">{String(index + 1).padStart(2, '0')}<small>/10</small></span><div className="quiz-progress"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div><p><strong>{score}</strong> doğru cevap</p><small>Her sorudan sonra açıklamayı ve kaynağı incele.</small></aside><section className="quiz-card"><header><span>{meta.name} bilgi testi</span><span>{index + 1} / {questions.length}</span></header><h3>{question.questionText}</h3><div className="quiz-options">{options.map((option) => { const isCorrect = selected && option === question.correctOption; const isWrong = selected === option && option !== question.correctOption; return <button key={option} className={`${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`} onClick={() => answer(option)} disabled={Boolean(selected)}><b>{option}</b><span>{question.options[option]}</span>{isCorrect && <AppIcon name="circle-check-filled" />}{isWrong && <AppIcon name="circle-x-filled" />}</button> })}</div>{selected && <motion.div className={`answer-explanation ${answeredCorrectly ? 'correct' : 'learn'}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}><span><AppIcon name={answeredCorrectly ? 'circle-check' : 'bulb'} /></span><div><strong>{answeredCorrectly ? 'Doğru cevap' : `Doğru cevap: ${question.correctOption}`}</strong><p>{question.explanationText}</p><a href={question.sourceUrl} target="_blank" rel="noopener noreferrer">Kaynağı incele <AppIcon name="external-link" /></a></div></motion.div>}<footer><span>{wasRewarded ? 'Tekrar turu · XH ödülü verilmez' : 'İlk tamamlama ödülü: 40 + doğru başına 5 XH'}</span><button className="primary-button" disabled={!selected} onClick={() => void next()}>{index === questions.length - 1 ? 'Sonucu gör' : 'Sonraki soru'} <AppIcon name="arrow-right" /></button></footer></section></div>
}

