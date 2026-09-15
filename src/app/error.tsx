'use client'

import { useEffect, useState } from 'react'

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    console.error('[SAH UI] Route error', { digest: error.digest || 'unavailable', name: error.name })
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [error])

  return <main className="route-state-page"><section className="route-state-card" role="alert"><span className="state-icon">!</span><p className="eyebrow">{offline ? 'Bağlantı bekleniyor' : 'İçerik yüklenemedi'}</p><h1>{offline ? 'İnternet bağlantını kontrol et' : 'Buradan güvenle devam edebiliriz'}</h1><p>{offline ? 'Bağlantın geri geldiğinde yeniden deneyebilirsin.' : 'İçerik görüntülenirken bir sorun oluştu. Yeniden yüklemek kayıtlarını silmez.'}</p><button type="button" className="primary-button" onClick={retry}>Yeniden dene</button><p><button type="button" className="route-reload" onClick={() => window.location.reload()}>Sayfayı tamamen yenile</button></p>{error.digest && <small>Destek kodu: {error.digest}</small>}</section></main>
}
