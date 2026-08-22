'use client'

import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'

export function AnimatedNumber({ value, suffix = '', className = '' }: { value: number; suffix?: string; className?: string }) {
  const number = useMotionValue(value)
  const rounded = useTransform(number, (latest) => `${Math.round(latest).toLocaleString('tr-TR')}${suffix}`)

  useEffect(() => {
    const controls = animate(number, value, { duration: .55, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [number, value])

  return <motion.span className={className}>{rounded}</motion.span>
}
