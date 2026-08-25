'use client'

import { useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import PrayerTimes from './PrayerTimes'
import MescidimLibrary from './MescidimLibrary'

type MescidimTab = 'vakitler' | 'asma' | 'dua'

export default function MescidimView({ reward }: { reward: (amount: number, label: string, sourceType: string, sourceId: string) => void }) {
  const [tab, setTab] = useState<MescidimTab>('vakitler')
  return <div className="mescidim-experience">
    <nav className="mescidim-main-tabs" aria-label="Mescidim alanları">
      <button className={tab === 'vakitler' ? 'active' : ''} onClick={() => setTab('vakitler')}><AppIcon name="clock"/><span><strong>Vakitler ve zikir</strong><small>Namaz takvimi · tesbih</small></span></button>
      <button className={tab === 'asma' ? 'active' : ''} onClick={() => setTab('asma')}><AppIcon name="sparkles"/><span><strong>Esmâü’l Hüsnâ</strong><small>99 isim · günlük tefekkür</small></span></button>
      <button className={tab === 'dua' ? 'active' : ''} onClick={() => setTab('dua')}><AppIcon name="book-2"/><span><strong>Dua Kütüphanesi</strong><small>Kaynaklı · aranabilir</small></span></button>
    </nav>
    {tab === 'vakitler' ? <PrayerTimes reward={reward} /> : <MescidimLibrary initialTab={tab} onTabChange={setTab} key={tab} />}
  </div>
}
