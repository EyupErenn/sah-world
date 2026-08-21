'use client'

import { useEffect, useState } from 'react'

const steps = [
  { icon: '✦', eyebrow: '1 / 3 · Alanın', title: 'SAH senin kişisel alanın', text: 'Günlük, hedef, şükür ve manevi notlarını tek bir sakin düzende tutarsın.' },
  { icon: '↗', eyebrow: '2 / 3 · İlerlemen', title: 'Her kayıt gelişime dönüşür', text: 'Tutarlılığın XP, seviye ve seri olarak görünür; Evren kartın seninle birlikte büyür.' },
  { icon: '◎', eyebrow: '3 / 3 · İlk adım', title: 'Küçük bir kayıtla başla', text: 'Bugün aklında kalan bir cümleyi günlüğüne yaz. Kusursuz olmasına gerek yok.' },
]

export default function WelcomeGuide({ createdAt, onStart }: { createdAt: string; onStart: () => void }) {
  const [step, setStep] = useState(0)
  const [closed, setClosed] = useState(true)
  useEffect(() => {
    const isNew = Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000
    queueMicrotask(() => setClosed(!isNew || localStorage.getItem('sah-welcome-complete') === 'true'))
  }, [createdAt])
  if (closed) return null

  const finish = (start = false) => {
    localStorage.setItem('sah-welcome-complete', 'true')
    setClosed(true)
    if (start) onStart()
  }
  const current = steps[step]
  return <div className="welcome-backdrop" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    <section className="welcome-card">
      <button className="welcome-skip" type="button" onClick={() => finish()}>Atla</button>
      <div className="welcome-visual"><span>{current.icon}</span><i /><i /></div>
      <p className="eyebrow">{current.eyebrow}</p><h2 id="welcome-title">{current.title}</h2><p>{current.text}</p>
      <div className="welcome-dots">{steps.map((_, index)=><i key={index} className={index===step?'active':''}/>)}</div>
      <button className="primary-button" type="button" onClick={() => step === steps.length - 1 ? finish(true) : setStep((value)=>value+1)}>{step === steps.length - 1 ? 'İlk kaydımı oluştur' : 'Devam et'} →</button>
    </section>
  </div>
}
