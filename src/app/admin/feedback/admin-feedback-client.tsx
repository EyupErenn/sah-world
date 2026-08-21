'use client'

import Link from 'next/link'
import { updateFeedbackAction } from './actions'
import type { AdminFeedbackRow, FeedbackStatus } from '@/types/database'

type Stats = { total_count: number; received_count: number; reviewing_count: number; planned_count: number; completed_count: number; average_rating: number | null }
const statusLabels: Record<FeedbackStatus, string> = { received: 'Yeni', reviewing: 'İnceleniyor', planned: 'Planlandı', completed: 'Tamamlandı', closed: 'Kapatıldı' }
const typeLabels: Record<string, string> = { suggestion: 'Öneri', bug: 'Hata', usability: 'Kullanılabilirlik', content: 'İçerik', performance: 'Performans', other: 'Diğer' }

export function AdminFeedbackClient({ items, stats, currentPage, filters }: { items: AdminFeedbackRow[]; stats: Stats | null; currentPage: number; filters: Record<string, string | undefined> }) {
  const total = items[0]?.total_count || 0
  const pages = Math.max(1, Math.ceil(total / 20))
  const pageHref = (page: number) => {
    const next = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => { if (value && key !== 'page') next.set(key, value) })
    next.set('page', String(page)); return `/admin/feedback?${next}`
  }

  return <>
    <header className="admin-header"><Link className="standalone-brand" href="/"><span>S</span><strong>SAH</strong></Link><div><span>Yönetim Merkezi</span><Link href="/feedback">Kullanıcı görünümü</Link></div></header>
    <div className="admin-shell">
      <div className="admin-heading"><div><p className="eyebrow">Ürün zekâsı</p><h1>Geri Bildirim Merkezi</h1><p>Kullanıcı sinyallerini tek kuyrukta değerlendir, yanıtla ve ürün kararlarına dönüştür.</p></div><span className="admin-secure-chip">✓ Sunucu + RLS korumalı</span></div>
      <section className="admin-stats">
        <AdminStat label="Toplam açık" value={stats?.total_count || 0} icon="◎"/><AdminStat label="Yeni" value={stats?.received_count || 0} icon="✦"/><AdminStat label="İnceleniyor" value={stats?.reviewing_count || 0} icon="⌁"/><AdminStat label="Planlandı" value={stats?.planned_count || 0} icon="↗"/><AdminStat label="Tamamlandı" value={stats?.completed_count || 0} icon="✓"/><AdminStat label="Ort. puan" value={stats?.average_rating ?? '—'} icon="★"/>
      </section>
      <form className="admin-filters" method="get">
        <label><span>Arama</span><input name="search" defaultValue={filters.search} maxLength={120} placeholder="Başlık veya kullanıcı…" /></label>
        <label><span>Durum</span><select name="status" defaultValue={filters.status || ''}><option value="">Tümü</option>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Tür</span><select name="type" defaultValue={filters.type || ''}><option value="">Tümü</option>{Object.entries(typeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Puan</span><select name="rating" defaultValue={filters.rating || ''}><option value="">Tümü</option>{[5,4,3,2,1].map(value=><option key={value} value={value}>{value} yıldız</option>)}</select></label>
        <label><span>Sıralama</span><select name="sort" defaultValue={filters.sort || 'newest'}><option value="newest">En yeni</option><option value="oldest">En eski</option></select></label>
        <label className="archive-filter"><input type="checkbox" name="archived" value="true" defaultChecked={filters.archived === 'true'} /><span>Arşivi göster</span></label>
        <button type="submit">Filtrele</button>
      </form>
      <section className="admin-list surface-card">
        <div className="admin-list-heading"><strong>{total} sonuç</strong><span>Sayfa {currentPage} / {pages}</span></div>
        {items.length === 0 ? <div className="empty-state"><i>✓</i><strong>Bu filtrede kayıt yok</strong><p>Filtreleri temizleyebilir veya yeni gönderimleri bekleyebilirsin.</p></div> : items.map((item) => <details className="admin-feedback-item" key={item.id}>
          <summary><img src={item.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(item.display_name)}`} alt=""/><div><strong>{item.title}</strong><span>{item.display_name} · {typeLabels[item.type]}</span></div><span className={`feedback-status ${item.status}`}>{statusLabels[item.status]}</span><span className="admin-rating">{item.rating ? `${item.rating} ★` : '—'}</span><time>{new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium'}).format(new Date(item.created_at))}</time><i>⌄</i></summary>
          <div className="admin-detail"><div className="admin-message"><p>{item.message}</p><dl><div><dt>Sayfa</dt><dd>{item.page_path}</dd></div><div><dt>Gönderim</dt><dd>{new Intl.DateTimeFormat('tr-TR',{dateStyle:'long',timeStyle:'short'}).format(new Date(item.created_at))}</dd></div>{item.reviewed_at&&<div><dt>Son işlem</dt><dd>{new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium'}).format(new Date(item.reviewed_at))}</dd></div>}</dl></div>
            <form action={updateFeedbackAction} className="admin-response"><input type="hidden" name="id" value={item.id}/><label><span>Durum</span><select name="status" defaultValue={item.status}>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label><span>Kullanıcıya yanıt</span><textarea name="response" maxLength={4000} rows={5} defaultValue={item.admin_response || ''} placeholder="Kararı ve sonraki adımı açıkça paylaş…"/></label><div><button name="archive" value="false" type="submit">Kaydet ve yanıtla</button><button className="archive-button" name="archive" value="true" type="submit">Arşivle</button></div></form>
          </div>
        </details>)}
        <nav className="admin-pagination" aria-label="Sayfalar"><Link aria-disabled={currentPage <= 1} href={pageHref(Math.max(1,currentPage-1))}>← Önceki</Link><span>{currentPage} / {pages}</span><Link aria-disabled={currentPage >= pages} href={pageHref(Math.min(pages,currentPage+1))}>Sonraki →</Link></nav>
      </section>
    </div>
  </>
}

function AdminStat({label,value,icon}:{label:string;value:string|number;icon:string}) { return <article><i>{icon}</i><span><small>{label}</small><strong>{value}</strong></span></article> }
