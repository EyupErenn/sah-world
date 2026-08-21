import Link from 'next/link'

export default function NotFound() {
  return <main className="route-state-page"><section className="route-state-card"><span className="state-icon">404</span><p className="eyebrow">Sayfa bulunamadı</p><h1>Aradığın alan burada değil</h1><p>Bağlantı değişmiş olabilir. Kişisel alanına dönerek devam edebilirsin.</p><Link className="primary-button" href="/">Evrenim’e dön</Link></section></main>
}
