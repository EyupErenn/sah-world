'use client'

import { useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import PrayerTimes from './PrayerTimes'
import MescidimLibrary from './MescidimLibrary'
import MosqueEventArchive from './MosqueEventArchive'

type MescidimTab = 'vakitler' | 'asma' | 'dua' | 'etkinlikler'

export default function MescidimView({ reward }: { reward: (amount: number, label: string, sourceType: string, sourceId: string) => void }) {
  const [tab, setTab] = useState<MescidimTab>('vakitler')
  return <div className="mescidim-experience">
    <section className="mosque-identity-hero">
      <div className="mosque-identity-art" aria-hidden="true">
        <span className="mosque-moon" />
        <svg viewBox="0 0 420 230" role="img">
          <defs><linearGradient id="mosqueDome" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f6d98f"/><stop offset="1" stopColor="#d89b3e"/></linearGradient><linearGradient id="mosqueWall" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fffdf5"/><stop offset="1" stopColor="#e7e2d4"/></linearGradient></defs>
          <path d="M57 189h306v24H57z" fill="#2f685d" opacity=".28"/>
          <path d="M118 102h184v91H118z" fill="url(#mosqueWall)"/>
          <path d="M145 102c9-45 121-45 130 0z" fill="url(#mosqueDome)"/>
          <path d="M209 45v20" stroke="#d89b3e" strokeWidth="5" strokeLinecap="round"/><path d="M209 43a11 11 0 1 1 0-21 9 9 0 1 0 0 21z" fill="#f4c65b"/>
          <path d="M76 56h26v137H76z" fill="url(#mosqueWall)"/><path d="M72 56h34L89 27z" fill="url(#mosqueDome)"/><path d="M88 27V12" stroke="#d89b3e" strokeWidth="4"/>
          <path d="M318 56h26v137h-26z" fill="url(#mosqueWall)"/><path d="M314 56h34l-17-29z" fill="url(#mosqueDome)"/><path d="M332 27V12" stroke="#d89b3e" strokeWidth="4"/>
          <path d="M185 193v-52a25 25 0 0 1 50 0v52" fill="#194c46"/><path d="M137 130h25v30h-25zm121 0h25v30h-25z" fill="#8dd6c0" opacity=".72"/>
        </svg>
      </div>
      <div className="mosque-identity-copy"><span className="eyebrow">BURSA TEKNİK ÜNİVERSİTESİ · MESCİDİM</span><h2>Şehit Astsubay Ömer Halisdemir Camii</h2><p>Vakitlerin, tefekkürün ve üniversite topluluğunun ortak hafızası. İbadet ritmini takip et; kaynaklı manevi kütüphaneyi ve camimizin etkinlik arşivini keşfet.</p><div><span><AppIcon name="map-pin" /> Bursa</span><span><AppIcon name="shield-check" /> Güvenli topluluk arşivi</span></div></div>
    </section>
    <nav className="mescidim-main-tabs" aria-label="Mescidim alanları">
      <button className={tab === 'vakitler' ? 'active' : ''} onClick={() => setTab('vakitler')}><AppIcon name="clock"/><span><strong>Vakitler ve zikir</strong><small>Namaz takvimi · tesbih</small></span></button>
      <button className={tab === 'asma' ? 'active' : ''} onClick={() => setTab('asma')}><AppIcon name="sparkles"/><span><strong>Esmâü’l Hüsnâ</strong><small>99 isim · günlük tefekkür</small></span></button>
      <button className={tab === 'dua' ? 'active' : ''} onClick={() => setTab('dua')}><AppIcon name="book-2"/><span><strong>Dua Kütüphanesi</strong><small>Kaynaklı · aranabilir</small></span></button>
      <button className={tab === 'etkinlikler' ? 'active' : ''} onClick={() => setTab('etkinlikler')}><AppIcon name="calendar-heart"/><span><strong>Etkinlik Arşivi</strong><small>Sohbet · eğitim · dayanışma</small></span></button>
    </nav>
    {tab === 'vakitler' ? <PrayerTimes reward={reward} /> : tab === 'etkinlikler' ? <MosqueEventArchive /> : <MescidimLibrary initialTab={tab} onTabChange={setTab} key={tab} />}
  </div>
}
