'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

const POINT_COUNT = 200
const CENTER = 260
const RADIUS = 222
const DRAW_DURATION_MS = 4200
const HOLD_DURATION_MS = 1500
const FADE_DURATION_MS = 600

type AnimationPhase = 'drawing' | 'holding' | 'fading' | 'complete'

type Thread = {
  x1: number
  y1: number
  x2: number
  y2: number
  opacity: number
}

function pointAt(index: number) {
  const angle = (index / POINT_COUNT) * Math.PI * 2
  return {
    x: CENTER + Math.cos(angle) * RADIUS,
    y: CENTER + Math.sin(angle) * RADIUS,
  }
}

export default function CardioidMotif() {
  const uid = useId().replace(/:/g, '')
  const [visibleCount, setVisibleCount] = useState(0)
  const [phase, setPhase] = useState<AnimationPhase>('drawing')
  const previousCount = useRef(-1)
  const currentPhase = useRef<AnimationPhase>('drawing')

  const threads = useMemo<Thread[]>(
    () =>
      Array.from({ length: POINT_COUNT }, (_, index) => {
        const start = pointAt(index)
        const end = pointAt((index * 2) % POINT_COUNT)
        return {
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
          opacity: 0.3 + 0.34 * Math.sin(((index + 1) / POINT_COUNT) * Math.PI),
        }
      }),
    [],
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let startedAt = performance.now()

    const showStaticShape = () => {
      window.cancelAnimationFrame(frame)
      previousCount.current = POINT_COUNT
      currentPhase.current = 'complete'
      setVisibleCount(POINT_COUNT)
      setPhase('complete')
    }

    const updatePhase = (nextPhase: AnimationPhase) => {
      if (currentPhase.current === nextPhase) return
      currentPhase.current = nextPhase
      setPhase(nextPhase)
    }

    const animate = (now: number) => {
      const elapsed = now - startedAt

      if (elapsed < DRAW_DURATION_MS) {
        const nextCount = Math.min(
          POINT_COUNT,
          Math.floor((elapsed / DRAW_DURATION_MS) * POINT_COUNT),
        )
        if (nextCount !== previousCount.current) {
          previousCount.current = nextCount
          setVisibleCount(nextCount)
        }
        updatePhase('drawing')
      } else if (elapsed < DRAW_DURATION_MS + HOLD_DURATION_MS) {
        if (previousCount.current !== POINT_COUNT) {
          previousCount.current = POINT_COUNT
          setVisibleCount(POINT_COUNT)
        }
        updatePhase('holding')
      } else if (elapsed < DRAW_DURATION_MS + HOLD_DURATION_MS + FADE_DURATION_MS) {
        updatePhase('fading')
      } else {
        startedAt = now
        previousCount.current = 0
        setVisibleCount(0)
        updatePhase('drawing')
      }

      frame = window.requestAnimationFrame(animate)
    }

    const syncMotionPreference = () => {
      if (mediaQuery.matches) {
        showStaticShape()
        return
      }
      startedAt = performance.now()
      previousCount.current = -1
      currentPhase.current = 'drawing'
      setVisibleCount(0)
      setPhase('drawing')
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(animate)
    }

    syncMotionPreference()
    mediaQuery.addEventListener('change', syncMotionPreference)

    return () => {
      window.cancelAnimationFrame(frame)
      mediaQuery.removeEventListener('change', syncMotionPreference)
    }
  }, [])

  return (
    <figure
      className={`cardioid-motif cardioid-${phase}`}
      aria-label="İki ile çarpım tablosunun oluşturduğu kardiyoid"
    >
      <svg viewBox="0 0 520 520" role="img" aria-labelledby={`${uid}-title ${uid}-desc`}>
        <title id={`${uid}-title`}>İki ile çarpım tablosu kardiyoid deseni</title>
        <desc id={`${uid}-desc`}>
          Bir çember üzerindeki 200 noktanın her biri, sıra numarasının iki katına
          karşılık gelen noktaya düz bir çizgiyle bağlanır.
        </desc>
        <defs>
          <linearGradient id={`${uid}-thread`} x1="8%" y1="8%" x2="92%" y2="92%">
            <stop offset="0" stopColor="#818cf8" />
            <stop offset="0.48" stopColor="#4f46e5" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
          <radialGradient id={`${uid}-atmosphere`}>
            <stop offset="0" stopColor="#7c3aed" stopOpacity="0.16" />
            <stop offset="0.62" stopColor="#4f46e5" stopOpacity="0.07" />
            <stop offset="1" stopColor="#4f46e5" stopOpacity="0" />
          </radialGradient>
          <filter id={`${uid}-glow`} x="-18%" y="-18%" width="136%" height="136%">
            <feGaussianBlur stdDeviation="1.35" result="softGlow" />
            <feMerge>
              <feMergeNode in="softGlow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle className="cardioid-atmosphere" cx={CENTER} cy={CENTER} r="252" fill={`url(#${uid}-atmosphere)`} />
        <circle className="cardioid-boundary" cx={CENTER} cy={CENTER} r={RADIUS} />
        <g className="cardioid-threads" filter={`url(#${uid}-glow)`} aria-hidden="true">
          {threads.map((thread, index) => (
            <line
              className={`times-table-line ${index < visibleCount ? 'is-visible' : ''}`}
              key={index}
              x1={thread.x1}
              y1={thread.y1}
              x2={thread.x2}
              y2={thread.y2}
              stroke={`url(#${uid}-thread)`}
              style={{ '--thread-opacity': thread.opacity } as CSSProperties}
            />
          ))}
        </g>
        <g className="cardioid-points" aria-hidden="true">
          {Array.from({ length: POINT_COUNT / 4 }, (_, index) => {
            const point = pointAt(index * 4)
            return <circle key={index} cx={point.x} cy={point.y} r="1.25" />
          })}
        </g>
      </svg>
    </figure>
  )
}
