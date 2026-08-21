import Link from 'next/link'

const messages: Record<string, string> = {
  missing_code: 'Giriş yanıtı eksik geldi. Lütfen yeniden deneyin.',
  exchange_failed: 'Google oturumu güvenli biçimde doğrulanamadı. Lütfen yeniden deneyin.',
  provider_cancelled: 'Google ile giriş tamamlanmadı. Hazır olduğunda yeniden deneyebilirsin.',
}

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string; ref?: string }> }) {
  const { reason, ref } = await searchParams
  const message = messages[reason || ''] || 'Giriş sırasında beklenmeyen bir sorun oluştu.'

  return (
    <main className="auth-message-page">
      <section className="auth-message-card" role="alert">
        <span className="auth-message-icon" aria-hidden>!</span>
        <p className="eyebrow">Giriş tamamlanamadı</p>
        <h1>Tekrar deneyelim</h1>
        <p>{message}</p>
        {ref && <small>Destek kodu: {ref}</small>}
        <Link className="sah-button-primary" href="/">Giriş ekranına dön</Link>
      </section>
    </main>
  )
}
