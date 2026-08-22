'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'

export type Milestone = { id: string; eyebrow: string; title: string; message: string; icon: string } | null

export default function MilestoneCelebration({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) {
  useEffect(() => {
    if (!milestone) return
    const confetti = (window as Window & { confetti?: (options: Record<string, unknown>) => void }).confetti
    if (confetti) {
      confetti({ particleCount: 90, spread: 72, origin: { y: .72 }, colors: ['#4f46e5', '#7c3aed', '#c4b5fd', '#fbbf24'] })
    }
  }, [milestone])

  return <AnimatePresence>{milestone && <motion.div className="milestone-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.section className="milestone-card" role="dialog" aria-modal="true" aria-labelledby="milestone-title" initial={{ opacity: 0, y: 24, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .97 }} transition={{ type: 'spring', stiffness: 280, damping: 24 }}>
      <div className="milestone-orbit" aria-hidden><i /><i /><span><AppIcon name={milestone.icon} /></span></div>
      <span className="eyebrow">{milestone.eyebrow}</span><h2 id="milestone-title">{milestone.title}</h2><p>{milestone.message}</p>
      <button className="primary-button" onClick={onClose}>Bu anı karşıla <AppIcon name="sparkles" /></button>
      <small>Bu yalnızca uygulamadaki istikrarını kutlar.</small>
    </motion.section>
  </motion.div>}</AnimatePresence>
}
