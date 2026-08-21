import Link from 'next/link'

const messages: Record<string, string> = {
  missing_code: 'Giriş yanıtı eksik geldi. Lütfen yeniden deneyin.',
  exchange_failed: 'Google oturumu güvenli biçimde doğrulanamadı. Lütfen yeniden deneyin.',
}

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams
  const message = messages[reason || ''] || 'Giriş sırasında beklenmeyen bir sorun oluştu.'

  return (
    <main className="auth-message-page">
      <section className="auth-message-card" role="alert">
        <span className="auth-message-icon" aria-hidden>!</span>
        <p className="eyebrow">Giriş tamamlanamadı</p>
        <h1>Tekrar deneyelim</h1>
        <p>{message}</p>
        <Link className="sah-button-primary" href="/">Giriş ekranına dön</Link>
      </section>
    </main>
  )
}
