'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { AppIcon } from '@/components/ui/AppIcon'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import type { MosqueEventCategory, MosqueEventRow } from '@/types/database'

const BUCKET = 'mosque-event-photos'
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const CATEGORIES: Record<MosqueEventCategory, { label: string; icon: string }> = {
  sohbet: { label: 'Sohbet', icon: 'messages' },
  egitim: { label: 'Eğitim', icon: 'school' },
  yardim: { label: 'Yardımlaşma', icon: 'heart-handshake' },
  genclik: { label: 'Gençlik', icon: 'users-group' },
  ozel: { label: 'Özel Program', icon: 'star' },
}

type EditorState = {
  event: MosqueEventRow | null
  title: string
  description: string
  eventDate: string
  category: MosqueEventCategory
  cover: File | null
  gallery: File[]
}

const emptyEditor = (): EditorState => ({
  event: null,
  title: '',
  description: '',
  eventDate: new Date().toLocaleDateString('en-CA'),
  category: 'sohbet',
  cover: null,
  gallery: [],
})

const formatDate = (value: string) => new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric', month: 'long', year: 'numeric', weekday: 'long', timeZone: 'UTC',
}).format(new Date(`${value}T12:00:00Z`))

const storagePathFromUrl = (url: string) => {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const index = url.indexOf(marker)
  return index < 0 ? null : decodeURIComponent(url.slice(index + marker.length))
}

export default function MosqueEventArchive() {
  const { user, profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const [events, setEvents] = useState<MosqueEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | MosqueEventCategory>('all')
  const [year, setYear] = useState('all')
  const [selected, setSelected] = useState<MosqueEventRow | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [saving, setSaving] = useState(false)

  const loadEvents = async () => {
    if (!user || user.id === 'guest-user-123') {
      setEvents([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase.from('mosque_events').select('*').order('event_date', { ascending: false }).order('created_at', { ascending: false })
    if (loadError) setError('Etkinlik arşivi şu anda yüklenemedi. Lütfen tekrar dene.')
    else setEvents(data || [])
    setLoading(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadEvents() }, 0)
    return () => window.clearTimeout(timer)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const years = useMemo(() => Array.from(new Set(events.map((event) => event.event_date.slice(0, 4)))).sort((a, b) => Number(b) - Number(a)), [events])
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR')
    return events.filter((event) => {
      const matchesText = !needle || `${event.title} ${event.description}`.toLocaleLowerCase('tr-TR').includes(needle)
      return matchesText && (category === 'all' || event.category === category) && (year === 'all' || event.event_date.startsWith(year))
    })
  }, [category, events, query, year])
  const grouped = useMemo(() => filtered.reduce<Record<string, MosqueEventRow[]>>((result, event) => {
    const eventYear = event.event_date.slice(0, 4)
    ;(result[eventYear] ||= []).push(event)
    return result
  }, {}), [filtered])

  const openEditor = (event?: MosqueEventRow) => setEditor(event ? {
    event,
    title: event.title,
    description: event.description,
    eventDate: event.event_date,
    category: event.category,
    cover: null,
    gallery: [],
  } : emptyEditor())

  const validateImage = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Yalnızca JPG, PNG veya WebP fotoğraf yükleyebilirsin.')
    if (file.size > MAX_IMAGE_BYTES) throw new Error('Her fotoğraf en fazla 10 MB olabilir.')
  }

  const uploadImage = async (file: File, eventId: string, label: string) => {
    validateImage(file)
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp'
    const path = `${user!.id}/${eventId}/${label}-${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type })
    if (uploadError) throw new Error('Fotoğraf yüklenemedi. Dosyayı kontrol edip tekrar dene.')
    return { path, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl }
  }

  const saveEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editor || !user || !isAdmin || saving) return
    setSaving(true)
    setError('')
    setNotice('')
    const eventId = editor.event?.id || crypto.randomUUID()
    const uploadedPaths: string[] = []
    try {
      let coverUrl = editor.event?.cover_image_url || null
      if (editor.cover) {
        const uploaded = await uploadImage(editor.cover, eventId, 'cover')
        uploadedPaths.push(uploaded.path)
        coverUrl = uploaded.url
      }
      const galleryUrls = [...(editor.event?.gallery_image_urls || [])]
      for (let index = 0; index < editor.gallery.length; index += 1) {
        const uploaded = await uploadImage(editor.gallery[index], eventId, `gallery-${index + 1}`)
        uploadedPaths.push(uploaded.path)
        galleryUrls.push(uploaded.url)
      }
      const payload = {
        title: editor.title.trim(),
        description: editor.description.trim(),
        event_date: editor.eventDate,
        category: editor.category,
        cover_image_url: coverUrl,
        gallery_image_urls: galleryUrls,
        created_by: user.id,
      }
      const result = editor.event
        ? await supabase.from('mosque_events').update(payload).eq('id', eventId).select().single()
        : await supabase.from('mosque_events').insert({ id: eventId, ...payload }).select().single()
      if (result.error) throw new Error('Etkinlik kaydedilemedi. Alanları ve yetkini kontrol edip tekrar dene.')
      setEditor(null)
      setNotice(editor.event ? 'Etkinlik güncellendi.' : 'Etkinlik arşive eklendi.')
      await loadEvents()
    } catch (saveError) {
      if (uploadedPaths.length) await supabase.storage.from(BUCKET).remove(uploadedPaths)
      setError(saveError instanceof Error ? saveError.message : 'Etkinlik kaydedilemedi.')
    } finally { setSaving(false) }
  }

  const deleteEvent = async (event: MosqueEventRow) => {
    if (!isAdmin || !window.confirm(`“${event.title}” etkinliğini kalıcı olarak silmek istiyor musun?`)) return
    setError('')
    const { error: deleteError } = await supabase.from('mosque_events').delete().eq('id', event.id)
    if (deleteError) { setError('Etkinlik silinemedi. Lütfen tekrar dene.'); return }
    const paths = [event.cover_image_url, ...event.gallery_image_urls].filter(Boolean).map((url) => storagePathFromUrl(url!)).filter((path): path is string => Boolean(path))
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
    setSelected(null)
    setNotice('Etkinlik ve arşiv fotoğrafları silindi.')
    await loadEvents()
  }

  return <section className="mosque-archive surface-card">
    <header className="mosque-archive-heading">
      <div><span className="eyebrow">CAMİ HAFIZASI</span><h2>Etkinlik arşivi</h2><p>Sohbetleri, eğitimleri ve dayanışma çalışmalarını yıllar içinde izleyen ortak hafıza.</p></div>
      {isAdmin && <button className="primary-button" onClick={() => openEditor()}><AppIcon name="plus" /> Yeni etkinlik</button>}
    </header>

    <div className="mosque-filterbar">
      <label className="mosque-search"><AppIcon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Etkinliklerde ara" aria-label="Etkinliklerde ara" /></label>
      <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} aria-label="Kategori filtresi"><option value="all">Tüm kategoriler</option>{Object.entries(CATEGORIES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select>
      <select value={year} onChange={(event) => setYear(event.target.value)} aria-label="Yıl filtresi"><option value="all">Tüm yıllar</option>{years.map((item) => <option key={item}>{item}</option>)}</select>
    </div>

    {error && <div className="mosque-message error" role="alert"><AppIcon name="alert-circle" /> {error}<button onClick={() => setError('')} aria-label="Uyarıyı kapat"><AppIcon name="x" /></button></div>}
    {notice && <div className="mosque-message success" role="status"><AppIcon name="circle-check" /> {notice}<button onClick={() => setNotice('')} aria-label="Bildirimi kapat"><AppIcon name="x" /></button></div>}
    {loading ? <div className="mosque-event-skeleton" aria-label="Etkinlikler yükleniyor"><i/><i/><i/></div> : filtered.length === 0 ? <div className="mosque-empty-state">
      <span><AppIcon name="calendar-heart" /></span><strong>{events.length ? 'Bu filtrelerde etkinlik bulunamadı' : 'Arşivin ilk sayfası hazır'}</strong><p>{events.length ? 'Arama veya filtre seçimini değiştirerek tekrar deneyebilirsin.' : 'Cami etkinlikleri eklendikçe burada tarih sırasıyla kalıcı bir hafızaya dönüşecek.'}</p>{isAdmin && !events.length && <button className="primary-button" onClick={() => openEditor()}><AppIcon name="plus" /> İlk etkinliği ekle</button>}
    </div> : <div className="mosque-timeline">{Object.entries(grouped).map(([eventYear, yearEvents]) => <section key={eventYear} className="mosque-year-group"><div className="mosque-year"><span>{eventYear}</span><i /></div><div className="mosque-year-events">{yearEvents.map((event) => <article className="mosque-event-card" key={event.id}>
      <button className="mosque-event-cover" onClick={() => setSelected(event)} aria-label={`${event.title} ayrıntılarını aç`}>{event.cover_image_url ? <Image src={event.cover_image_url} alt="" fill sizes="(max-width: 760px) 100vw, 180px" /> : <span><AppIcon name="building-mosque" /></span>}<em>{new Date(`${event.event_date}T12:00:00Z`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</em></button>
      <div className="mosque-event-copy"><span className={`mosque-category ${event.category}`}><AppIcon name={CATEGORIES[event.category].icon} /> {CATEGORIES[event.category].label}</span><h3>{event.title}</h3><p>{event.description}</p><div><button onClick={() => setSelected(event)}>Ayrıntıları gör <AppIcon name="arrow-right" /></button>{isAdmin && <span className="mosque-admin-actions"><button onClick={() => openEditor(event)} aria-label="Etkinliği düzenle"><AppIcon name="edit" /></button><button onClick={() => void deleteEvent(event)} aria-label="Etkinliği sil"><AppIcon name="trash" /></button></span>}</div></div>
    </article>)}</div></section>)}</div>}

    {selected && <div className="modal-backdrop mosque-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><article className="mosque-detail-modal" role="dialog" aria-modal="true" aria-labelledby="mosque-event-title">
      <button className="modal-close" onClick={() => setSelected(null)} aria-label="Kapat"><AppIcon name="x" /></button>
      {selected.cover_image_url ? <button className="mosque-detail-cover" onClick={() => setLightbox(selected.cover_image_url)}><Image src={selected.cover_image_url} alt={`${selected.title} kapak fotoğrafı`} fill sizes="(max-width: 760px) 100vw, 360px" /></button> : <div className="mosque-detail-cover placeholder"><AppIcon name="building-mosque" /></div>}
      <div className="mosque-detail-content"><span className={`mosque-category ${selected.category}`}><AppIcon name={CATEGORIES[selected.category].icon} /> {CATEGORIES[selected.category].label}</span><h2 id="mosque-event-title">{selected.title}</h2><time><AppIcon name="calendar-event" /> {formatDate(selected.event_date)}</time><p>{selected.description}</p>
        {selected.gallery_image_urls.length > 0 && <div className="mosque-gallery"><h3>Etkinlikten kareler</h3><div>{selected.gallery_image_urls.map((image, index) => <button key={image} onClick={() => setLightbox(image)}><Image src={image} alt={`${selected.title} galeri fotoğrafı ${index + 1}`} fill sizes="120px" /></button>)}</div></div>}
        {isAdmin && <div className="mosque-detail-admin"><button onClick={() => { setSelected(null); openEditor(selected) }}><AppIcon name="edit" /> Düzenle</button><button onClick={() => void deleteEvent(selected)}><AppIcon name="trash" /> Sil</button></div>}
      </div>
    </article></div>}

    {editor && <div className="modal-backdrop mosque-modal-backdrop" role="presentation"><form className="mosque-editor-modal" onSubmit={(event) => void saveEvent(event)} role="dialog" aria-modal="true" aria-labelledby="mosque-editor-title">
      <header><div><span className="eyebrow">YÖNETİCİ ALANI</span><h2 id="mosque-editor-title">{editor.event ? 'Etkinliği düzenle' : 'Yeni etkinlik ekle'}</h2></div><button type="button" className="modal-close" onClick={() => setEditor(null)} aria-label="Kapat"><AppIcon name="x" /></button></header>
      <div className="mosque-editor-grid"><label className="full"><span>Etkinlik adı</span><input required minLength={3} maxLength={140} value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} placeholder="Örn. Gençlik sohbeti" /></label><label><span>Tarih</span><input required type="date" value={editor.eventDate} onChange={(event) => setEditor({ ...editor, eventDate: event.target.value })} /></label><label><span>Kategori</span><select value={editor.category} onChange={(event) => setEditor({ ...editor, category: event.target.value as MosqueEventCategory })}>{Object.entries(CATEGORIES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label><label className="full"><span>Açıklama</span><textarea required minLength={10} maxLength={6000} rows={7} value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} placeholder="Programın içeriğini ve öne çıkan anlarını anlat…" /></label><label><span>Kapak fotoğrafı</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setEditor({ ...editor, cover: event.target.files?.[0] || null })} /><small>JPG, PNG veya WebP · en fazla 10 MB</small></label><label><span>Galeri fotoğrafları</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setEditor({ ...editor, gallery: Array.from(event.target.files || []) })} /><small>Birden fazla fotoğraf seçebilirsin</small></label></div>
      {editor.event?.gallery_image_urls.length ? <div className="mosque-existing-media"><span>Mevcut galeride {editor.event.gallery_image_urls.length} fotoğraf var. Yeni seçimler bunlara eklenir.</span></div> : null}
      <footer><button type="button" className="secondary-button" onClick={() => setEditor(null)}>İptal</button><button className="primary-button" disabled={saving}>{saving ? <><AppIcon name="loader-2" /> Kaydediliyor…</> : <><AppIcon name="device-floppy" /> {editor.event ? 'Değişiklikleri kaydet' : 'Etkinliği yayınla'}</>}</button></footer>
    </form></div>}

    {lightbox && <div className="mosque-lightbox" role="dialog" aria-modal="true" aria-label="Fotoğraf görüntüleyici" onClick={() => setLightbox(null)}><button onClick={() => setLightbox(null)} aria-label="Fotoğrafı kapat"><AppIcon name="x" /></button><Image src={lightbox} alt="Etkinlik fotoğrafı büyük görünüm" width={1600} height={1200} sizes="100vw" /></div>}
  </section>
}
