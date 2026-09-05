'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { isValidUUID, useJourneyStore } from '@/store/useJourneyStore'
import type { AppointmentRow, ChatMessageRow, HocaAvailabilityRow, HocaProfileRow, HocaTimeOffRow, QuranLevel, QuranPeerMatchRow, QuranStudyGoalRow } from '@/types/database'

type CompanionTab = 'home' | 'teachers' | 'appointments' | 'peers' | 'study' | 'manage'
type AppointmentView = AppointmentRow & { hoca_name: string; hoca_title: string; hoca_photo: string | null; student_name: string; student_avatar: string | null }
type PeerView = { id: string; partner_id: string; partner_name: string; partner_avatar: string | null; direction: 'sent' | 'received'; status: QuranPeerMatchRow['status']; message: string; created_at: string }
type HelperView = { id: string; display_name: string; avatar_url: string | null; xp: number; quran_level: QuranLevel }

const SAMPLE_HOCA: HocaProfileRow = {
  id: '7ca2b35d-8c4f-4d62-9c91-1f4898e7c201', user_id: null, display_name: 'İmam Hatip Ramazan Hoca', title: 'İmam Hatip',
  bio: 'Kur’an-ı Kerim öğretmenliği yapmaktadır. Bu örnek profil, yönetici tarafından gerçek bilgilerle güncellenmek üzere hazırlanmıştır.',
  specialties: ['Tecvid', 'Mahreç', 'Yeni Başlayanlar'], photo_url: null, is_active: true, is_placeholder: true,
  created_at: new Date(0).toISOString(), updated_at: new Date(0).toISOString(),
}
const LEVELS: Array<{ value: QuranLevel; title: string; detail: string; icon: string }> = [
  { value: 'beginner', title: 'Yeni başlıyorum', detail: 'Harfleri ve temel okumayı öğrenmek istiyorum.', icon: 'seedling' },
  { value: 'alphabet', title: 'Elifba biliyorum', detail: 'Okuyorum fakat henüz akıcı değilim.', icon: 'book' },
  { value: 'fluent', title: 'Akıcı okuyorum', detail: 'Tecvidimi ve mahrecimi geliştirmek istiyorum.', icon: 'book-2' },
  { value: 'helper', title: 'Destek olabilirim', detail: 'İyi seviyedeyim, bir kardeşime yardımcı olmak isterim.', icon: 'heart-handshake' },
]
const STATUS_LABELS: Record<AppointmentRow['status'], string> = { pending: 'Onay bekliyor', confirmed: 'Onaylandı', completed: 'Tamamlandı', cancelled: 'İptal edildi', no_show: 'Katılmadı' }
const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const dateKey = (date: Date) => date.toLocaleDateString('en-CA')
const avatar = (name: string, url?: string | null) => url || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`
const formatAppointment = (value: string) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }).format(new Date(value))
const timeOnly = (value: string) => new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }).format(new Date(value))

export default function QuranCompanionView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { user, profile, patchProfile } = useAuthStore()
  const journey = useJourneyStore()
  const [tab, setTab] = useState<CompanionTab>('home')
  const [teachers, setTeachers] = useState<HocaProfileRow[]>([])
  const [appointments, setAppointments] = useState<AppointmentView[]>([])
  const [goal, setGoal] = useState<QuranStudyGoalRow | null>(null)
  const [helpers, setHelpers] = useState<HelperView[]>([])
  const [matches, setMatches] = useState<PeerView[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const isRealUser = Boolean(user && isValidUUID(user.id))
  const userId = user?.id || ''
  const isAdmin = profile?.role === 'admin'
  const isHoca = profile?.role === 'hoca'

  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3500) }
  const load = async () => {
    if (!isRealUser) { setTeachers([SAMPLE_HOCA]); setLoading(false); return }
    setLoading(true)
    const [teacherResult, appointmentResult, goalResult, helperResult, matchResult] = await Promise.all([
      supabase.from('hoca_profiles').select('*').eq('is_active', true).order('created_at'),
      supabase.rpc('get_my_quran_appointments'),
      supabase.from('quran_study_goals').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.rpc('browse_quran_helpers'),
      supabase.rpc('get_my_quran_peer_matches'),
    ])
    setTeachers(teacherResult.data || [])
    setAppointments(appointmentResult.data || [])
    setGoal(goalResult.data || null)
    setHelpers(helperResult.data || [])
    setMatches(matchResult.data || [])
    const firstError = teacherResult.error || appointmentResult.error || goalResult.error || helperResult.error || matchResult.error
    setError(firstError ? 'Kur’an Kardeşim verileri tamamen yüklenemedi. Lütfen tekrar dene.' : '')
    setLoading(false)
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isRealUser || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const check = () => appointments.filter((item) => item.student_id === userId && item.status === 'confirmed').forEach((item) => {
      const minutes = (new Date(item.scheduled_start).getTime() - Date.now()) / 60_000
      const key = `sah-quran-appointment-reminder-${item.id}`
      if (minutes > 0 && minutes <= 30 && !window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, '1')
        new Notification('Kur’an Kardeşim · Randevun yaklaşıyor', { body: `${item.hoca_name} ile görüşmen ${Math.max(1, Math.ceil(minutes))} dakika sonra.`, icon: '/favicon.ico' })
      }
    })
    check(); const timer = window.setInterval(check, 60_000); return () => window.clearInterval(timer)
  }, [appointments, isRealUser, userId])

  const [renderTime] = useState(() => Date.now())
  const upcoming = appointments.filter((item) => ['pending', 'confirmed'].includes(item.status) && new Date(item.scheduled_end).getTime() > renderTime).sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))
  const ownedHoca = teachers.find((item) => item.user_id === user?.id)

  const saveLevel = async (level: QuranLevel) => {
    if (!isRealUser) { patchProfile({ quran_level: level }); flash('Geliştirme görünümünde seviye seçildi.'); return }
    const { error: updateError } = await supabase.from('profiles').update({ quran_level: level }).eq('id', user!.id)
    if (updateError) { setError('Seviyen kaydedilemedi.'); return }
    patchProfile({ quran_level: level }); flash('Kur’an okuma seviyen kaydedildi.'); await load()
  }

  const enableReminders = async () => {
    if (typeof Notification === 'undefined') { setError('Bu tarayıcı bildirimleri desteklemiyor.'); return }
    const permission = await Notification.requestPermission()
    flash(permission === 'granted' ? 'Randevu hatırlatmaları açıldı.' : 'Bildirim izni verilmedi.')
  }

  const navItems: Array<{ id: CompanionTab; label: string; icon: string }> = [
    { id: 'home', label: 'Başlangıç', icon: 'home-heart' }, { id: 'teachers', label: 'Hocalar', icon: 'calendar-user' },
    { id: 'appointments', label: 'Randevularım', icon: 'calendar-check' }, { id: 'peers', label: 'Akran desteği', icon: 'heart-handshake' },
    { id: 'study', label: 'Çalışma alanım', icon: 'notebook' }, ...((isHoca || isAdmin) ? [{ id: 'manage' as const, label: 'Hoca yönetimi', icon: 'settings' }] : []),
  ]

  return <div className="quran-companion">
    {notice && <div className="quran-toast" role="status"><AppIcon name="circle-check" /> {notice}</div>}
    <section className="quran-companion-hero">
      <div className="quran-hero-mark" aria-hidden="true"><span>اقْرَأْ</span><i/><i/></div>
      <div><span className="eyebrow">KUR’AN-I KERİM KARDEŞİM</span><h1>Öğrenirken yalnız değilsin.</h1><p>Güvenilir bir hocayla buluş, bir kardeşinle birlikte çalış ve Kur’an yolculuğunu küçük, istikrarlı adımlarla sürdür.</p><div className="quran-hero-actions"><button onClick={() => setTab('teachers')}><AppIcon name="calendar-user" /> Hoca ile randevu al</button><button onClick={() => setTab('study')}><AppIcon name="notebook" /> Çalışma alanıma git</button></div></div>
      <aside><small>YAKLAŞAN RANDEVU</small>{upcoming[0] ? <><strong>{upcoming[0].hoca_name}</strong><span>{formatAppointment(upcoming[0].scheduled_start)}</span></> : <><strong>Takvimin açık</strong><span>Sana uygun bir hoca ve saat seçebilirsin.</span></>}<button onClick={() => setTab(upcoming[0] ? 'appointments' : 'teachers')}>{upcoming[0] ? 'Randevuyu gör' : 'Uygun saatleri gör'} <AppIcon name="arrow-right" /></button></aside>
    </section>

    <section className="quran-virtues" aria-labelledby="quran-virtue-title">
      <article className="quran-virtue-feature"><span className="eyebrow">ÖĞRENMENİN VE ÖĞRETMENİN FAZİLETİ</span><p lang="ar" dir="rtl">خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ</p><h2 id="quran-virtue-title">“Sizin en hayırlınız, Kur’an’ı öğrenen ve öğretendir.”</h2><a href="https://hadislerleislam.diyanet.gov.tr/sayfa.php?CILT=1&SAYFA=553" target="_blank" rel="noreferrer">Buhârî, Fedâilü’l-Kur’ân, 21; hadis no. 5027 <AppIcon name="external-link" /></a></article>
      <article className="quran-virtue-ayah"><span><AppIcon name="book-2" /></span><div><small>FÂTIR 35:29-30 · KUR’AN YOLU MEALİ</small><p>Allah’ın kitabını okuyanlar, namazı özenle kılanlar ve kendilerine verilen rızıktan paylaşanlar, asla zararla sonuçlanmayacak bir kazanç umabilirler.</p><a href="https://kuran.diyanet.gov.tr/tefsir/fatir-suresi/3689/29-30-ayet-tefsiri" target="_blank" rel="noreferrer">Meali ve bağlamı Diyanet’te incele <AppIcon name="external-link" /></a></div></article>
    </section>

    <nav className="quran-companion-tabs" aria-label="Kur’an Kardeşim alanları">{navItems.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><AppIcon name={item.icon} /><span>{item.label}</span>{item.id === 'appointments' && upcoming.length > 0 && <em>{upcoming.length}</em>}</button>)}</nav>
    {error && <div className="quran-inline-error" role="alert"><AppIcon name="alert-circle" /><span>{error}</span><button onClick={() => void load()}>Tekrar dene</button></div>}
    {!profile?.quran_level && <LevelOnboarding onSelect={(level) => void saveLevel(level)} />}
    {loading ? <CompanionSkeleton /> : tab === 'home' ? <CompanionHome upcoming={upcoming} goal={goal} noteCount={journey.quranNotes.length} onTab={setTab} /> : tab === 'teachers' ? <TeacherDiscovery teachers={teachers} onBooked={async () => { await load(); setTab('appointments'); flash('Randevun onaylandı ve takvimine eklendi.') }} realUser={isRealUser} /> : tab === 'appointments' ? <AppointmentsView appointments={appointments} userId={userId} onReload={load} onReminders={() => void enableReminders()} /> : tab === 'peers' ? <PeerMatching helpers={helpers} matches={matches} level={profile?.quran_level || null} userId={userId} realUser={isRealUser} onReload={load} /> : tab === 'study' ? <StudyWorkspace goal={goal} notes={journey.quranNotes} appointments={appointments} userId={userId} realUser={isRealUser} onNavigate={onNavigate} onSaved={async () => { await load(); flash('Çalışma hedefin güncellendi.') }} /> : <HocaManagement teachers={teachers} ownedHoca={ownedHoca} appointments={appointments} isAdmin={isAdmin} onReload={load} />}
  </div>
}

function LevelOnboarding({ onSelect }: { onSelect: (level: QuranLevel) => void }) {
  return <section className="quran-level-onboarding"><header><span className="eyebrow">SANA UYGUN YOLCULUK</span><h2>Kur’an okuma seviyeni değerlendir</h2><p>Bu seçim yalnızca sana uygun hoca ve akran desteğini göstermek içindir; bir üstünlük ölçüsü değildir.</p></header><div>{LEVELS.map((item) => <button key={item.value} onClick={() => onSelect(item.value)}><AppIcon name={item.icon} /><span><strong>{item.title}</strong><small>{item.detail}</small></span><AppIcon name="arrow-right" /></button>)}</div></section>
}

function CompanionHome({ upcoming, goal, noteCount, onTab }: { upcoming: AppointmentView[]; goal: QuranStudyGoalRow | null; noteCount: number; onTab: (tab: CompanionTab) => void }) {
  return <section className="quran-home-grid"><button onClick={() => onTab('teachers')} className="quran-feature-card teacher"><span><AppIcon name="calendar-user" /></span><small>REHBERLİK</small><strong>Bir hocayla çalış</strong><p>Uygun günü ve saati seç; randevun anında takvimine işlensin.</p><em>Hocaları keşfet <AppIcon name="arrow-right" /></em></button><button onClick={() => onTab('peers')} className="quran-feature-card peer"><span><AppIcon name="heart-handshake" /></span><small>BİRLİKTE ÖĞREN</small><strong>Akran desteği bul</strong><p>Kur’an yolculuğunda sana gönüllü destek olabilecek bir kardeşle tanış.</p><em>Eşleşmeleri gör <AppIcon name="arrow-right" /></em></button><article className="quran-home-summary"><header><span><AppIcon name="progress" /></span><div><small>ÇALIŞMA ALANIN</small><h3>{goal?.title || 'İlk çalışma hedefini belirle'}</h3></div></header><div className="quran-goal-mini"><i><b style={{ width: `${goal?.progress_percent || 0}%` }} /></i><strong>%{goal?.progress_percent || 0}</strong></div><footer><span><b>{noteCount}</b> Kur’an notu</span><span><b>{upcoming.length}</b> yaklaşan randevu</span><button onClick={() => onTab('study')}>Alanı aç</button></footer></article></section>
}

function TeacherDiscovery({ teachers, onBooked, realUser }: { teachers: HocaProfileRow[]; onBooked: () => Promise<void>; realUser: boolean }) {
  const [selected, setSelected] = useState<HocaProfileRow | null>(null)
  return <section className="quran-panel"><header className="quran-panel-heading"><div><span className="eyebrow">RANDEVU SİSTEMİ</span><h2>Hocalar</h2><p>Uzmanlık alanını incele, uygun günü seç ve görüşme konunu ekle.</p></div></header>{teachers.length === 0 ? <EmptyState icon="calendar-off" title="Henüz aktif hoca yok" text="Yeni hocalar eklendiğinde burada görünecek." /> : <div className="hoca-grid">{teachers.map((teacher) => <article key={teacher.id} className="hoca-card"><div className="hoca-avatar">{teacher.photo_url ? <img src={teacher.photo_url} alt="" /> : <span>{teacher.display_name.split(' ').slice(-1)[0][0]}</span>}{teacher.is_placeholder && <em>Örnek profil</em>}</div><div><small>{teacher.title}</small><h3>{teacher.display_name}</h3><p>{teacher.bio}</p><div className="hoca-tags">{teacher.specialties.map((tag) => <span key={tag}>{tag}</span>)}</div></div><button onClick={() => setSelected(teacher)}>Randevu al <AppIcon name="arrow-right" /></button></article>)}</div>}{selected && <BookingFlow teacher={selected} onClose={() => setSelected(null)} onBooked={onBooked} realUser={realUser} />}</section>
}

function BookingFlow({ teacher, onClose, onBooked, realUser }: { teacher: HocaProfileRow; onClose: () => void; onBooked: () => Promise<void>; realUser: boolean }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [availableDays, setAvailableDays] = useState<Record<string, number>>({})
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<Array<{ slot_start: string; slot_end: string }>>([])
  const [selectedSlot, setSelectedSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!realUser) {
      const result: Record<string, number> = {}; for (let d = 1; d <= 31; d += 1) { const date = new Date(month.getFullYear(), month.getMonth(), d); if ([1, 3, 6].includes(date.getDay()) && date > new Date()) result[dateKey(date)] = 4 }
      const timer = window.setTimeout(() => setAvailableDays(result), 0); return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => { void supabase.rpc('get_hoca_available_days', { target_hoca_id: teacher.id, month_date: dateKey(month) }).then(({ data }) => setAvailableDays(Object.fromEntries((data || []).map((item) => [item.available_date, Number(item.slot_count)])))) }, 0)
    return () => window.clearTimeout(timer)
  }, [month, realUser, teacher.id])

  const chooseDate = async (key: string) => {
    setSelectedDate(key); setSelectedSlot(''); setBusy(true)
    if (!realUser) {
      setSlots(['10:00', '10:30', '11:00', '11:30'].map((time) => {
        const start = new Date(`${key}T${time}:00+03:00`)
        return { slot_start: start.toISOString(), slot_end: new Date(start.getTime() + 30 * 60_000).toISOString() }
      }))
      setBusy(false); return
    }
    const { data, error: slotError } = await supabase.rpc('get_hoca_available_slots', { target_hoca_id: teacher.id, target_date: key })
    setSlots(data || []); setError(slotError ? 'Saatler yüklenemedi.' : ''); setBusy(false)
  }
  const confirm = async () => {
    if (!selectedSlot || !realUser) { if (!realUser) setError('Canlı randevu oluşturmak için gerçek hesabınla giriş yap.'); return }
    setBusy(true); setError('')
    const { error: bookingError } = await supabase.rpc('book_hoca_appointment', { target_hoca_id: teacher.id, target_start: selectedSlot, notes })
    if (bookingError) { setError(bookingError.message.includes('SLOT_UNAVAILABLE') ? 'Bu saat az önce doldu. Lütfen başka bir saat seç.' : 'Randevu oluşturulamadı. Lütfen tekrar dene.'); setBusy(false); await chooseDate(selectedDate); return }
    await onBooked(); onClose()
  }
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const calendar = [...Array(new Date(month.getFullYear(), month.getMonth(), 1).getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))]
  return <div className="quran-modal-backdrop" role="presentation"><section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title"><button className="modal-close" onClick={onClose} aria-label="Kapat"><AppIcon name="x" /></button><aside><img src={avatar(teacher.display_name, teacher.photo_url)} alt="" /><span className="eyebrow">{teacher.title}</span><h2 id="booking-title">{teacher.display_name}</h2><p>{teacher.bio}</p><div className="hoca-tags">{teacher.specialties.map((tag) => <span key={tag}>{tag}</span>)}</div><small><AppIcon name="clock" /> Saatler Türkiye saatiyle gösterilir.</small></aside><div className="booking-calendar"><header><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Önceki ay"><AppIcon name="chevron-left" /></button><strong>{month.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</strong><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Sonraki ay"><AppIcon name="chevron-right" /></button></header><div className="calendar-weekdays">{DAYS.map((day) => <span key={day}>{day}</span>)}</div><div className="booking-days">{calendar.map((date, index) => date ? <button key={date.toISOString()} disabled={!availableDays[dateKey(date)]} className={selectedDate === dateKey(date) ? 'selected' : ''} onClick={() => void chooseDate(dateKey(date))}><span>{date.getDate()}</span>{availableDays[dateKey(date)] ? <i>{availableDays[dateKey(date)]}</i> : null}</button> : <i key={`blank-${index}`} />)}</div></div><div className="booking-slots"><span className="eyebrow">{selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : 'ÖNCE BİR GÜN SEÇ'}</span><h3>Uygun saatler</h3>{busy ? <div className="slot-loading">Saatler hazırlanıyor…</div> : selectedDate && slots.length === 0 ? <p>Bu gün için uygun saat kalmadı.</p> : <div className="slot-list">{slots.map((slot) => <button key={slot.slot_start} className={selectedSlot === slot.slot_start ? 'selected' : ''} onClick={() => setSelectedSlot(slot.slot_start)}>{timeOnly(slot.slot_start)}{selectedSlot === slot.slot_start && <AppIcon name="check" />}</button>)}</div>}{selectedSlot && <label className="booking-note"><span>Bugün ne üzerinde çalışmak istersin?</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={600} placeholder="Örn. Tecvid kuralları, ezber tekrarı…" /></label>}{error && <p className="booking-error">{error}</p>}<button className="primary-button booking-confirm" disabled={!selectedSlot || busy} onClick={() => void confirm()}><AppIcon name="calendar-check" /> Randevuyu onayla</button><small className="booking-policy">Randevu anında onaylanır. Başlangıçtan 2 saat öncesine kadar ücretsiz iptal edebilirsin.</small></div></section></div>
}

function AppointmentsView({ appointments, userId, onReload, onReminders }: { appointments: AppointmentView[]; userId: string; onReload: () => Promise<void>; onReminders: () => void }) {
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming')
  const [now] = useState(() => Date.now())
  const items = appointments.filter((item) => filter === 'upcoming' ? ['pending', 'confirmed'].includes(item.status) && new Date(item.scheduled_end).getTime() > now : !['pending', 'confirmed'].includes(item.status) || new Date(item.scheduled_end).getTime() <= now).sort((a, b) => filter === 'upcoming' ? a.scheduled_start.localeCompare(b.scheduled_start) : b.scheduled_start.localeCompare(a.scheduled_start))
  const cancel = async (item: AppointmentView) => {
    if (!window.confirm('Bu randevuyu iptal etmek istediğine emin misin?')) return
    const { error } = await supabase.rpc('cancel_hoca_appointment', { target_appointment_id: item.id, reason: 'Kullanıcı tarafından iptal edildi.' })
    if (error) window.alert(error.message.includes('CANCELLATION_WINDOW') ? 'Randevuya 2 saatten az kaldığı için uygulamadan iptal edilemez.' : 'Randevu iptal edilemedi.')
    else await onReload()
  }
  return <section className="quran-panel"><header className="quran-panel-heading split"><div><span className="eyebrow">PROGRAMIN</span><h2>Randevularım</h2><p>Yaklaşan görüşmelerini ve tamamlanan çalışma geçmişini tek yerde izle.</p></div><button className="secondary-button" onClick={onReminders}><AppIcon name="bell" /> 30 dk önce hatırlat</button></header><div className="appointment-toggle"><button className={filter === 'upcoming' ? 'active' : ''} onClick={() => setFilter('upcoming')}>Yaklaşan</button><button className={filter === 'past' ? 'active' : ''} onClick={() => setFilter('past')}>Geçmiş</button></div>{items.length === 0 ? <EmptyState icon="calendar-smile" title={filter === 'upcoming' ? 'Yaklaşan randevun yok' : 'Henüz geçmiş randevu yok'} text="Uygun olduğunda yeni bir çalışma saati seçebilirsin." /> : <div className="appointment-list">{items.map((item) => { const asHoca = item.student_id !== userId; return <article key={item.id}><time><strong>{new Date(item.scheduled_start).toLocaleDateString('tr-TR', { day: '2-digit', timeZone: 'Europe/Istanbul' })}</strong><span>{new Date(item.scheduled_start).toLocaleDateString('tr-TR', { month: 'short', timeZone: 'Europe/Istanbul' })}</span></time><img src={avatar(asHoca ? item.student_name : item.hoca_name, asHoca ? item.student_avatar : item.hoca_photo)} alt="" /><div><span className={`appointment-status ${item.status}`}>{STATUS_LABELS[item.status]}</span><h3>{asHoca ? item.student_name : item.hoca_name}</h3><p>{formatAppointment(item.scheduled_start)} · {Math.round((new Date(item.scheduled_end).getTime() - new Date(item.scheduled_start).getTime()) / 60_000)} dk</p>{item.topic_notes && <blockquote>“{item.topic_notes}”</blockquote>}</div>{['pending', 'confirmed'].includes(item.status) && <button onClick={() => void cancel(item)}>İptal et</button>}</article>})}</div>}</section>
}

function PeerMatching({ helpers, matches, level, userId, realUser, onReload }: { helpers: HelperView[]; matches: PeerView[]; level: QuranLevel | null; userId: string; realUser: boolean; onReload: () => Promise<void> }) {
  const [activeChat, setActiveChat] = useState<PeerView | null>(null)
  const request = async (helper: HelperView) => {
    const message = window.prompt(`${helper.display_name} için kısa bir tanışma notu (isteğe bağlı):`, 'Birlikte Kur’an çalışmak isterim.') ?? null
    if (message === null) return
    if (!realUser) { window.alert('Eşleşme isteği için gerçek hesabınla giriş yap.'); return }
    const { error } = await supabase.rpc('send_quran_peer_request', { target_helper_id: helper.id, request_message: message })
    if (error) window.alert('İstek gönderilemedi.'); else await onReload()
  }
  const respond = async (match: PeerView, accept: boolean) => { const { error } = await supabase.rpc('respond_quran_peer_match', { target_match_id: match.id, accept_request: accept }); if (!error) await onReload() }
  return <section className="quran-panel"><header className="quran-panel-heading"><div><span className="eyebrow">AKRAN DESTEĞİ</span><h2>Birlikte öğrenmek kolaylaştırır</h2><p>Bu alan yalnızca Kur’an öğrenme desteği içindir. Kişisel bilgilerini paylaşmadan uygulama içinden iletişim kur.</p></div></header>{level === 'helper' ? <div className="peer-helper-note"><AppIcon name="heart-handshake" /><div><strong>Destek veren olarak görünüyorsun</strong><span>Daha erken aşamadaki kullanıcılar sana eşleşme isteği gönderebilir.</span></div></div> : <><h3 className="subsection-title">Destek olabilecek kardeşler</h3>{helpers.length === 0 ? <EmptyState icon="users-minus" title="Şimdilik uygun destekçi yok" text="Yeni gönüllüler katıldığında burada görünecek." /> : <div className="helper-grid">{helpers.map((helper) => <article key={helper.id}><img src={avatar(helper.display_name, helper.avatar_url)} alt="" /><div><strong>{helper.display_name}</strong><span>Gönüllü akran desteği</span></div><button onClick={() => void request(helper)}>İstek gönder</button></article>)}</div>}</>}<h3 className="subsection-title">Eşleşmelerim</h3>{matches.length === 0 ? <EmptyState icon="message-circle" title="Henüz eşleşmen yok" text="Gönderdiğin ve sana gelen istekler burada görünür." compact /> : <div className="peer-match-list">{matches.map((match) => <article key={match.id}><img src={avatar(match.partner_name, match.partner_avatar)} alt="" /><div><strong>{match.partner_name}</strong><span>{match.direction === 'received' ? 'Sana gönderildi' : 'Sen gönderdin'} · {match.status === 'pending' ? 'Yanıt bekliyor' : match.status === 'accepted' ? 'Eşleşti' : 'Olumsuz'}</span>{match.message && <p>{match.message}</p>}</div>{match.direction === 'received' && match.status === 'pending' ? <span className="peer-actions"><button onClick={() => void respond(match, true)}>Kabul et</button><button onClick={() => void respond(match, false)}>Reddet</button></span> : match.status === 'accepted' ? <button onClick={() => setActiveChat(match)}>Mesajlaş</button> : null}</article>)}</div>}{activeChat && <PeerChat match={activeChat} userId={userId} onClose={() => setActiveChat(null)} />}</section>
}

function PeerChat({ match, userId, onClose }: { match: PeerView; userId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([])
  const [text, setText] = useState('')
  useEffect(() => {
    const query = `and(sender_id.eq.${userId},receiver_id.eq.${match.partner_id}),and(sender_id.eq.${match.partner_id},receiver_id.eq.${userId})`
    void supabase.from('chat_messages').select('*').is('group_id', null).or(query).order('created_at').then(({ data }) => setMessages(data || []))
    const channel = supabase.channel(`quran-peer-${match.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
      const item = payload.new as ChatMessageRow
      if ((item.sender_id === userId && item.receiver_id === match.partner_id) || (item.sender_id === match.partner_id && item.receiver_id === userId)) setMessages((current) => current.some((message) => message.id === item.id) ? current : [...current, item])
    }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [match.id, match.partner_id, userId])
  const send = async (event: React.FormEvent) => { event.preventDefault(); const content = text.trim(); if (!content) return; setText(''); await supabase.from('chat_messages').insert({ sender_id: userId, receiver_id: match.partner_id, group_id: null, content, is_read: false }) }
  return <div className="quran-modal-backdrop"><section className="peer-chat-modal" role="dialog" aria-modal="true" aria-label={`${match.partner_name} ile mesajlaşma`}><header><img src={avatar(match.partner_name, match.partner_avatar)} alt="" /><div><strong>{match.partner_name}</strong><span>Kur’an çalışma eşleşmesi</span></div><button onClick={onClose}><AppIcon name="x" /></button></header><div className="peer-messages">{messages.length === 0 && <p>Çalışma zamanını belirlemek için ilk mesajı gönderebilirsin.</p>}{messages.map((message) => <article key={message.id} className={message.sender_id === userId ? 'mine' : ''}>{message.content}<time>{new Date(message.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time></article>)}</div><form onSubmit={(event) => void send(event)}><input value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} placeholder="Mesajını yaz…" /><button aria-label="Mesaj gönder"><AppIcon name="send" /></button></form></section></div>
}

function StudyWorkspace({ goal, notes, appointments, userId, realUser, onNavigate, onSaved }: { goal: QuranStudyGoalRow | null; notes: ReturnType<typeof useJourneyStore.getState>['quranNotes']; appointments: AppointmentView[]; userId: string; realUser: boolean; onNavigate: (view: string) => void; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState(goal?.title || '')
  const [progress, setProgress] = useState(goal?.progress_percent || 0)
  const related = appointments.filter((item) => item.student_id === userId && item.topic_notes).slice(0, 4)
  const save = async (event: React.FormEvent) => { event.preventDefault(); if (!realUser) return; const payload = { id: goal?.id || crypto.randomUUID(), user_id: userId, title: title.trim(), progress_percent: progress }; const { error } = await supabase.from('quran_study_goals').upsert(payload, { onConflict: 'user_id' }); if (!error) await onSaved() }
  return <section className="study-workspace"><article className="study-goal-card"><header><span><AppIcon name="target-arrow" /></span><div><small>ÇALIŞMA HEDEFİ</small><h2>İstikrarlı bir adım belirle</h2></div></header><form onSubmit={(event) => void save(event)}><label><span>Hedefin</span><textarea required minLength={3} maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Örn. Haftada üç kez tecvid pratiği yapmak…" /></label><label className="goal-range"><span><b>İlerleme</b><strong>%{progress}</strong></span><input type="range" min="0" max="100" step="5" value={progress} onChange={(event) => setProgress(Number(event.target.value))} /></label><button className="primary-button" disabled={!realUser}><AppIcon name="device-floppy" /> Hedefi kaydet</button></form></article><article className="study-notes-card"><header><div><small>AYNI VERİ, YENİ BAĞLAM</small><h2>Son Kur’an notların</h2></div><button onClick={() => onNavigate('quran')}>Tümünü aç <AppIcon name="arrow-right" /></button></header>{notes.length === 0 ? <EmptyState icon="book-off" title="Henüz Kur’an notun yok" text="Bugünün Çarkı veya not arşivinden ilk notunu ekleyebilirsin." compact /> : <div>{notes.slice(0, 4).map((note) => <button key={note.id} onClick={() => onNavigate('quran')}><span><AppIcon name="book-2" /></span><div><strong>{note.ayet || note.sure}</strong><p>{note.ders || note.tefsir}</p><small>{new Date(`${note.date}T12:00:00`).toLocaleDateString('tr-TR')}</small></div></button>)}</div>}</article><article className="study-reflection-card"><span className="eyebrow">BU HAFTA NE ÇALIŞTIM?</span><h2>Görüşme konularından izler</h2>{related.length === 0 ? <p>İlk hoca görüşmenden sonra çalışma başlıkların burada kısa bir hazırlık ve değerlendirme listesine dönüşecek.</p> : <ul>{related.map((item) => <li key={item.id}><AppIcon name="circle-check" /><span><strong>{item.topic_notes}</strong><small>{item.hoca_name} · {formatAppointment(item.scheduled_start)}</small></span></li>)}</ul>}</article></section>
}

function HocaManagement({ teachers, ownedHoca, appointments, isAdmin, onReload }: { teachers: HocaProfileRow[]; ownedHoca?: HocaProfileRow; appointments: AppointmentView[]; isAdmin: boolean; onReload: () => Promise<void> }) {
  const [managedId, setManagedId] = useState(ownedHoca?.id || (isAdmin ? teachers[0]?.id || '' : ''))
  const effectiveManagedId = managedId || ownedHoca?.id || (isAdmin ? teachers[0]?.id || '' : '')
  const managed = teachers.find((item) => item.id === effectiveManagedId)
  const [availability, setAvailability] = useState<HocaAvailabilityRow[]>([])
  const [timeOff, setTimeOff] = useState<HocaTimeOffRow[]>([])
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<Array<{ id: string; display_name: string; email: string; avatar_url: string | null; role: 'user' | 'admin' | 'hoca' }>>([])
  const loadSchedule = async () => { if (!effectiveManagedId) return; const [a, t] = await Promise.all([supabase.from('hoca_availability').select('*').eq('hoca_id', effectiveManagedId).order('day_of_week'), supabase.from('hoca_time_off').select('*').eq('hoca_id', effectiveManagedId).order('start_datetime')]); setAvailability(a.data || []); setTimeOff(t.data || []) }
  useEffect(() => { const timer = window.setTimeout(() => { void loadSchedule() }, 0); return () => window.clearTimeout(timer) }, [effectiveManagedId]) // eslint-disable-line react-hooks/exhaustive-deps
  const searchUsers = async (event: React.FormEvent) => { event.preventDefault(); const { data } = await supabase.rpc('admin_search_quran_users', { search_text: search }); setUsers(data || []) }
  const setRole = async (id: string, role: 'user' | 'hoca') => { const { error } = await supabase.rpc('admin_set_quran_role', { target_user_id: id, next_role: role }); if (!error) { const { data } = await supabase.rpc('admin_search_quran_users', { search_text: search }); setUsers(data || []); await onReload() } }
  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!managed) return; const fd = new FormData(event.currentTarget); await supabase.from('hoca_profiles').update({ display_name: String(fd.get('name')), title: String(fd.get('title')), bio: String(fd.get('bio')), specialties: String(fd.get('specialties')).split(',').map((item) => item.trim()).filter(Boolean), photo_url: String(fd.get('photo')) || null, is_active: fd.get('active') === 'on' }).eq('id', managed.id); await onReload() }
  const addAvailability = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!managed) return; const fd = new FormData(event.currentTarget); await supabase.from('hoca_availability').insert({ hoca_id: managed.id, day_of_week: Number(fd.get('day')), start_time: String(fd.get('start')), end_time: String(fd.get('end')), slot_duration_minutes: Number(fd.get('duration')), is_recurring: true, specific_date: null }); event.currentTarget.reset(); await loadSchedule() }
  const addTimeOff = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!managed) return; const fd = new FormData(event.currentTarget); await supabase.from('hoca_time_off').insert({ hoca_id: managed.id, start_datetime: new Date(String(fd.get('start'))).toISOString(), end_datetime: new Date(String(fd.get('end'))).toISOString(), reason: String(fd.get('reason')) }); event.currentTarget.reset(); await loadSchedule() }
  const updateStatus = async (id: string, status: 'completed' | 'no_show') => { await supabase.from('appointments').update({ status }).eq('id', id); await onReload() }
  return <section className="quran-management"><header className="quran-panel-heading"><div><span className="eyebrow">YETKİLİ ALAN</span><h2>Hoca ve takvim yönetimi</h2><p>Profil, haftalık müsaitlik, izin dönemleri ve görüşme durumlarını güvenle yönet.</p></div>{isAdmin && <select value={managedId} onChange={(event) => setManagedId(event.target.value)}>{teachers.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select>}</header>{isAdmin && <article className="admin-role-card"><header><span><AppIcon name="shield-check" /></span><div><small>YALNIZCA YÖNETİCİ</small><h3>Hoca yetkisi ata</h3></div></header><form onSubmit={(event) => void searchUsers(event)}><input value={search} onChange={(event) => setSearch(event.target.value)} minLength={2} placeholder="Ad veya e-posta ile ara" /><button>Ara</button></form>{users.map((item) => <div className="admin-user-row" key={item.id}><img src={avatar(item.display_name, item.avatar_url)} alt="" /><span><strong>{item.display_name}</strong><small>{item.email} · {item.role}</small></span>{item.role !== 'admin' && <button onClick={() => void setRole(item.id, item.role === 'hoca' ? 'user' : 'hoca')}>{item.role === 'hoca' ? 'Yetkiyi kaldır' : 'Hoca yap'}</button>}</div>)}</article>}{managed ? <div className="management-grid"><form className="manage-profile-card" onSubmit={(event) => void saveProfile(event)}><h3>Hoca profili</h3><label>Görünen ad<input name="name" defaultValue={managed.display_name} required /></label><label>Unvan<input name="title" defaultValue={managed.title} required /></label><label>Kısa biyografi<textarea name="bio" defaultValue={managed.bio} rows={4} /></label><label>Uzmanlıklar<input name="specialties" defaultValue={managed.specialties.join(', ')} /></label><label>Fotoğraf URL’si<input name="photo" defaultValue={managed.photo_url || ''} /></label><label className="check-field"><input type="checkbox" name="active" defaultChecked={managed.is_active} /> Aktif profilde göster</label><button className="primary-button">Profili kaydet</button></form><section className="manage-availability-card"><h3>Haftalık müsaitlik</h3><form onSubmit={(event) => void addAvailability(event)}><select name="day">{DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select><input name="start" type="time" defaultValue="18:00" required /><input name="end" type="time" defaultValue="20:00" required /><select name="duration" defaultValue="30"><option value="20">20 dk</option><option value="30">30 dk</option><option value="45">45 dk</option><option value="60">60 dk</option></select><button><AppIcon name="plus" /> Ekle</button></form><div className="availability-list">{availability.map((item) => <article key={item.id}><strong>{DAYS[item.day_of_week]}</strong><span>{item.start_time.slice(0,5)}–{item.end_time.slice(0,5)} · {item.slot_duration_minutes} dk</span><button onClick={async () => { await supabase.from('hoca_availability').delete().eq('id', item.id); await loadSchedule() }}><AppIcon name="trash" /></button></article>)}</div></section><section className="manage-timeoff-card"><h3>İzin / kapalı zaman</h3><form onSubmit={(event) => void addTimeOff(event)}><input name="start" type="datetime-local" required /><input name="end" type="datetime-local" required /><input name="reason" placeholder="Kısa açıklama (isteğe bağlı)" /><button><AppIcon name="plus" /> Engelle</button></form>{timeOff.map((item) => <article key={item.id}><span><strong>{formatAppointment(item.start_datetime)}</strong><small>{item.reason || 'Müsait değil'}</small></span><button onClick={async () => { await supabase.from('hoca_time_off').delete().eq('id', item.id); await loadSchedule() }}><AppIcon name="trash" /></button></article>)}</section><section className="manage-appointments-card"><h3>Yaklaşan öğrenciler</h3>{appointments.filter((item) => item.hoca_id === managed.id && ['pending','confirmed'].includes(item.status)).map((item) => <article key={item.id}><img src={avatar(item.student_name, item.student_avatar)} alt="" /><span><strong>{item.student_name}</strong><small>{formatAppointment(item.scheduled_start)} · {item.topic_notes || 'Konu belirtilmedi'}</small></span><div><button onClick={() => void updateStatus(item.id, 'completed')}>Tamamlandı</button><button onClick={() => void updateStatus(item.id, 'no_show')}>Gelmedi</button></div></article>)}</section></div> : <EmptyState icon="user-off" title="Yönetilecek hoca profili yok" text="Yönetici bir kullanıcıya hoca rolü atadığında profil burada oluşur." />}</section>
}

function EmptyState({ icon, title, text, compact = false }: { icon: string; title: string; text: string; compact?: boolean }) { return <div className={`quran-empty ${compact ? 'compact' : ''}`}><span><AppIcon name={icon} /></span><strong>{title}</strong><p>{text}</p></div> }
function CompanionSkeleton() { return <div className="quran-companion-skeleton" aria-label="Kur’an Kardeşim yükleniyor"><i/><i/><i/></div> }
