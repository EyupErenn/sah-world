'use client'

import { useId, useMemo } from 'react'

export default function CardioidMotif() {
  const uid = useId().replace(/:/g, '')
  const path = useMemo(() => {
    const points = Array.from({ length: 241 }, (_, index) => {
      const t = (index / 240) * Math.PI * 2
      const x = 2 * Math.cos(t) - Math.cos(2 * t)
      const y = 2 * Math.sin(t) - Math.sin(2 * t)
      // The exact parametric cardioid is rotated so its cusp points downward.
      return `${index === 0 ? 'M' : 'L'}${(160 + y * 43).toFixed(2)} ${(132 + x * 35).toFixed(2)}`
    })
    return `${points.join(' ')} Z`
  }, [])

  return <figure className="cardioid-motif" aria-label="Parametrik bir kardiyoid eğrisi">
    <svg viewBox="0 0 320 260" role="img" aria-labelledby={`${uid}-title ${uid}-desc`}>
      <title id={`${uid}-title`}>Niyetin yön verdiği kardiyoid</title>
      <desc id={`${uid}-desc`}>x eşittir a çarpı iki kosinüs t eksi kosinüs iki t; y eşittir a çarpı iki sinüs t eksi sinüs iki t denklemleriyle çizilen eğri.</desc>
      <defs>
        <linearGradient id={`${uid}-line`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#93c5fd"/><stop offset=".5" stopColor="#c4b5fd"/><stop offset="1" stopColor="#f9a8d4"/></linearGradient>
        <radialGradient id={`${uid}-halo`}><stop stopColor="#8b5cf6" stopOpacity=".34"/><stop offset="1" stopColor="#8b5cf6" stopOpacity="0"/></radialGradient>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="160" cy="128" r="116" fill={`url(#${uid}-halo)`} className="cardioid-halo"/>
      <g className="cardioid-grid" opacity=".23" stroke="#c7d2fe" strokeWidth=".7"><path d="M44 132h232M160 18v220"/><circle cx="160" cy="132" r="76" fill="none" strokeDasharray="2 8"/></g>
      <path d={path} fill="rgba(139,92,246,.06)" stroke={`url(#${uid}-line)`} strokeWidth="2.4" pathLength="1" className="cardioid-path" filter={`url(#${uid}-glow)`}/>
      <circle cx="160" cy="167" r="3.5" fill="#f5d0fe" className="cardioid-cusp"/>
    </svg>
    <figcaption><span>x=a(2cos t−cos 2t)</span><span>y=a(2sin t−sin 2t)</span></figcaption>
  </figure>
}
