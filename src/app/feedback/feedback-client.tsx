'use client'

import { useActionState, useEffect, useRef } from 'react'
import { initialFeedbackState, submitFeedbackAction } from './actions'
import type { FeedbackRow, FeedbackStatus, FeedbackType } from '@/types/database'

const types: Array<{ value: FeedbackType; label: string; icon: string; help: string }> = [
  { value: 'suggestion', label: 'Öneri', icon: '✦', help: 'Yeni bir fikir' }, { value: 'bug', label: 'Hata', icon: '!', help: 'Çalışmayan bir şey' },
  { value: 'usability', label: 'Kullanılabilirlik', icon: '◎', help: 'Deneyim iyileştirmesi' }, { value: 'content', label: 'İçerik', icon: '≡', help: 'Metin veya bölüm' },
  { value: 'performance', label: 'Performans', icon: '↗', help: 'Hız ve akıcılık' }, { value: 'other', label: 'Diğer', icon: '…', help: 'Başka bir konu' },
]
const statusLabels: Record<FeedbackStatus, string> = { received: 'Alındı', reviewing: 'İnceleniyor', planned: 'Planlandı', completed: 'Tamamlandı', closed: 'Kapatıldı' }

export function FeedbackClient({ initialItems }: { initialItems: FeedbackRow[] }) {
  const [state, action, pending] = useActionState(submitFeedbackAction, initialFeedbackState)
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state.status === 'success') formRef.current?.reset() }, [state.status])

  return <div className="feedback-shell">
    <section className="feedback-hero"><div><p className="eyebrow">Birlikte daha iyi</p><h1>Görüş ve Öneri</h1><p>SAH’ı kullanırken fark ettiğin her ayrıntı değerlidir. Mesajın doğrudan ürün takip sistemine eklenir.</p></div><div className="feedback-promise"><span>↗</span><strong>Şeffaf takip</strong><small>Durumu ve yönetici yanıtını burada görürsün.</small></div></section>

    <div className="feedback-grid">
      <form ref={formRef} action={action} className="surface-card feedback-form">
        <div className="card-heading"><div><p className="eyebrow">Yeni gönderim</p><h2>Ne paylaşmak istersin?</h2></div><span className="quiet-chip">Ortalama 2 dk.</span></div>
        <fieldset><legend>Görüş türü</legend><div className="feedback-types">{types.map((item) => <label key={item.value}><input type="radio" name="type" value={item.value} defaultChecked={item.value === 'suggestion'} /><span><i>{item.icon}</i><b>{item.label}</b><small>{item.help}</small></span></label>)}</div></fieldset>
        <label className="feedback-field"><span>Başlık <small>5–120 karakter</small></span><input name="title" maxLength={120} minLength={5} required placeholder="Kısaca ne hakkında?" aria-invalid={Boolean(state.fieldErrors?.title)} />{state.fieldErrors?.title?.map((error) => <em key={error}>{error}</em>)}</label>
        <label className="feedback-field"><span>Ayrıntılar <small>20–4000 karakter</small></span><textarea name="message" minLength={20} maxLength={4000} rows={8} required placeholder="Ne oldu, ne bekliyordun ve nasıl daha iyi olabilir?" aria-invalid={Boolean(state.fieldErrors?.message)} />{state.fieldErrors?.message?.map((error) => <em key={error}>{error}</em>)}</label>
        <fieldset className="rating-field"><legend>Genel deneyim puanın <small>(isteğe bağlı)</small></legend><div>{[1,2,3,4,5].map((rating) => <label key={rating}><input type="radio" name="rating" value={rating} /><span aria-label={`${rating} yıldız`}>★</span></label>)}</div></fieldset>
        <input type="hidden" name="pagePath" value="/feedback" />
        {state.message && <div className={`feedback-result ${state.status}`} role={state.status === 'error' ? 'alert' : 'status'}><span>{state.status === 'success' ? '✓' : '!'}</span><p>{state.message}</p></div>}
        <button className="primary-button feedback-submit" type="submit" disabled={pending}>{pending ? <><i /> Gönderiliyor…</> : 'Görüşümü gönder ↗'}</button>
        <p className="feedback-security">Hesap kimliğin sunucuda doğrulanır. Sayfa sorguları ve hassas oturum bilgileri geri bildirimle birlikte kaydedilmez.</p>
      </form>

      <section className="surface-card feedback-history"><div className="card-heading"><div><p className="eyebrow">Takip alanın</p><h2>Gönderimlerim</h2></div><span className="quiet-chip">{initialItems.length} kayıt</span></div>
        {initialItems.length === 0 ? <div className="empty-state"><i>✦</i><strong>Henüz bir gönderimin yok</strong><p>İlk görüşünü gönderdiğinde durumu ve yanıtı burada takip edebilirsin.</p></div> : <div className="feedback-list">{initialItems.map((item) => <article key={item.id}>
          <div className="feedback-item-top"><span className={`feedback-status ${item.status}`}>{statusLabels[item.status]}</span><time dateTime={item.created_at}>{new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.created_at))}</time></div>
          <h3>{item.title}</h3><p>{item.message}</p><div className="feedback-item-meta"><span>{types.find((type) => type.value === item.type)?.label}</span>{item.rating && <span>{'★'.repeat(item.rating)}<i>{'★'.repeat(5-item.rating)}</i></span>}</div>
          {item.admin_response && <blockquote><strong>SAH ekibinin yanıtı</strong><p>{item.admin_response}</p></blockquote>}
        </article>)}</div>}
      </section>
    </div>
  </div>
}
