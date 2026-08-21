'use client'

import { useEffect, useState } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    console.error('[SAH UI] Route error', { digest: error.digest || 'unavailable', name: error.name })
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [error])

  return <main className="route-state-page"><section className="route-state-card" role="alert"><span className="state-icon">!</span><p className="eyebrow">{offline ? 'Bağlantı bekleniyor' : 'İçerik yüklenemedi'}</p><h1>{offline ? 'İnternet bağlantını kontrol et' : 'Buradan güvenle devam edebiliriz'}</h1><p>{offline ? 'Bağlantın geri geldiğinde yeniden deneyebilirsin.' : 'Kayıtların etkilenmedi. İçeriği yeniden yüklemeyi deneyebilirsin.'}</p><button className="primary-button" onClick={reset}>Yeniden dene</button>{error.digest && <small>Destek kodu: {error.digest}</small>}</section></main>
}
