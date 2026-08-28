'use client'
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { getLevelForXP } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import type { ChatMessageRow, GroupRow } from '@/types/database'
import { AppIcon } from '@/components/ui/AppIcon'

type RosterMember = {
  user_id: string
  display_name: string
  avatar_url: string | null
  xp: number
  streak_current: number
  badges: string[]
  role: 'owner' | 'member'
  joined_at: string
}

type GroupPreview = Pick<GroupRow, 'id' | 'name' | 'description' | 'group_code' | 'member_count'>
type DialogMode = 'create' | 'join' | null
type BusyAction = 'create' | 'preview' | 'join' | 'leave' | 'delete' | 'rotate' | 'send' | null

export default function CommunityView() {
  const { user } = useAuthStore()
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [activeId, setActiveId] = useState('')
  const [roster, setRoster] = useState<RosterMember[]>([])
  const [messages, setMessages] = useState<ChatMessageRow[]>([])
  const [hasOlder, setHasOlder] = useState(false)
  const [mode, setMode] = useState<'members' | 'chat'>('members')
  const [dialog, setDialog] = useState<DialogMode>(null)
  const [joinPreview, setJoinPreview] = useState<GroupPreview | null>(null)
  const [busy, setBusy] = useState<BusyAction>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const dialogTitleId = useId()
  const active = groups.find((group) => group.id === activeId) ?? groups[0]

  const flash = useCallback((text: string) => {
    setNotice(text)
    window.setTimeout(() => setNotice(''), 2800)
  }, [])

  const fail = useCallback((candidate: unknown) => {
    setError(friendlyCommunityError(candidate))
  }, [])

  const loadGroups = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: requestError } = await supabase.rpc('get_my_groups')
    if (requestError) {
      fail(requestError)
      setGroups([])
    } else {
      const next = (data ?? []) as GroupRow[]
      setGroups(next)
      setActiveId((id) => next.some((group) => group.id === id) ? id : next[0]?.id ?? '')
    }
    setLoading(false)
  }, [fail])

  const loadGroupData = useCallback(async (id: string) => {
    if (!id) return
    setError('')
    const [rosterResult, messageResult] = await Promise.all([
      supabase.rpc('get_group_roster', { target_group_id: id }),
      supabase.from('chat_messages').select('*').eq('group_id', id).order('created_at', { ascending: false }).limit(50),
    ])
    if (rosterResult.error) fail(rosterResult.error)
    else setRoster((rosterResult.data ?? []) as RosterMember[])
    if (messageResult.error) fail(messageResult.error)
    else {
      const page = (messageResult.data ?? []) as ChatMessageRow[]
      setMessages([...page].reverse())
      setHasOlder(page.length === 50)
    }
  }, [fail])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadGroups(), 0)
    return () => window.clearTimeout(timer)
  }, [loadGroups])

  useEffect(() => {
    if (!active?.id) return
    const timer = window.setTimeout(() => void loadGroupData(active.id), 0)
    return () => window.clearTimeout(timer)
  }, [active?.id, loadGroupData])

  useEffect(() => {
    if (!active?.id) return
    const channel = supabase
      .channel(`group-chat:${active.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${active.id}` }, (payload) => {
        const row = payload.new as ChatMessageRow
        setMessages((current) => current.some((item) => item.id === row.id) ? current : [...current, row])
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [active?.id])

  useEffect(() => {
    if (mode === 'chat') endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, mode])

  const closeDialog = () => {
    if (busy) return
    setDialog(null)
    setJoinPreview(null)
    setError('')
  }

  const openDialog = (next: Exclude<DialogMode, null>) => {
    setError('')
    setJoinPreview(null)
    setDialog(next)
  }

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    setBusy('create')
    setError('')
    const { error: requestError } = await supabase.rpc('create_group', { group_name: name, group_description: description })
    setBusy(null)
    if (requestError) return fail(requestError)
    setDialog(null)
    flash('Topluluk güvenle oluşturuldu')
    await loadGroups()
  }

  const previewOrJoin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const code = normalizeCode(String(new FormData(event.currentTarget).get('code') ?? ''))
    setError('')
    if (code.length !== 6) {
      setJoinPreview(null)
      return setError('Davet kodu 6 karakter olmalı.')
    }

    if (!joinPreview || joinPreview.group_code !== code) {
      setBusy('preview')
      const { data, error: requestError } = await supabase.rpc('preview_group_by_code', { lookup_code: code })
      setBusy(null)
      if (requestError) return fail(requestError)
      const preview = (data?.[0] ?? null) as GroupPreview | null
      if (!preview) return setError('Bu kodla eşleşen bir topluluk bulunamadı.')
      setJoinPreview(preview)
      return
    }

    setBusy('join')
    const { error: requestError } = await supabase.rpc('join_group_by_code', { join_code: code })
    setBusy(null)
    if (requestError) return fail(requestError)
    setDialog(null)
    setJoinPreview(null)
    flash(`${joinPreview.name} topluluğuna katıldın`)
    await loadGroups()
  }

  const leave = async () => {
    if (!active || busy || !window.confirm('Bu topluluktan ayrılmak istiyor musun?')) return
    setBusy('leave')
    const { error: requestError } = await supabase.rpc('leave_group', { target_group_id: active.id })
    setBusy(null)
    if (requestError) return fail(requestError)
    flash('Topluluktan ayrıldın')
    await loadGroups()
  }

  const remove = async () => {
    if (!active || busy || !window.confirm('Topluluk ve grup mesajları kalıcı olarak silinecek. Devam edilsin mi?')) return
    setBusy('delete')
    const { error: requestError } = await supabase.rpc('delete_group', { target_group_id: active.id })
    setBusy(null)
    if (requestError) return fail(requestError)
    flash('Topluluk silindi')
    await loadGroups()
  }

  const rotateCode = async () => {
    if (!active || busy || !window.confirm('Eski davet kodu hemen geçersiz olacak. Yeni kod oluşturulsun mu?')) return
    setBusy('rotate')
    const { data, error: requestError } = await supabase.rpc('rotate_group_code', { target_group_id: active.id })
    setBusy(null)
    if (requestError) return fail(requestError)
    setGroups((current) => current.map((group) => group.id === active.id ? { ...group, group_code: String(data) } : group))
    flash('Yeni davet kodu oluşturuldu')
  }

  const copyCode = async () => {
    if (!active) return
    try {
      await navigator.clipboard.writeText(active.group_code)
      flash('Grup kodu kopyalandı')
    } catch {
      setError('Kod kopyalanamadı. Kodu seçip elle kopyalayabilirsin.')
    }
  }

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!active || !user || busy) return
    const form = event.currentTarget
    const content = String(new FormData(form).get('message') ?? '').trim()
    if (!content) return
    setBusy('send')
    const { data, error: requestError } = await supabase.rpc('send_group_message', { target_group_id: active.id, message_content: content })
    setBusy(null)
    if (requestError) return fail(requestError)
    form.reset()
    const row = data as ChatMessageRow
    setMessages((current) => current.some((item) => item.id === row.id) ? current : [...current, row])
  }

  const loadOlder = async () => {
    if (!active || !messages[0]) return
    const { data, error: requestError } = await supabase.from('chat_messages').select('*').eq('group_id', active.id).lt('created_at', messages[0].created_at).order('created_at', { ascending: false }).limit(50)
    if (requestError) return fail(requestError)
    const page = (data ?? []) as ChatMessageRow[]
    setMessages((current) => [...page].reverse().concat(current))
    setHasOlder(page.length === 50)
  }

  if (loading) return <div className="loading-panel"><span /><p>Toplulukların hazırlanıyor…</p></div>

  return <div className="view-stack community-view">
    <header className="page-heading"><div><span className="eyebrow">BİRLİKTE İSTİKRAR</span><h1>Topluluk</h1><p>Yalnızca seviye, XH ve seri özetini paylaş; kişisel kayıt içeriklerin daima sana özel kalır.</p></div><div className="heading-actions"><button className="ghost-button" onClick={() => openDialog('join')}>Kodla katıl</button><button className="primary-button" onClick={() => openDialog('create')}>+ Grup oluştur</button></div></header>

    {(error || notice) && <div role="status" className={error ? 'inline-alert error' : 'inline-alert success'}><span>{error ? '!' : '✓'}</span><p>{error || notice}</p>{error && <button className="alert-retry" onClick={() => void loadGroups()}>Yeniden dene</button>}<button aria-label="Bildirimi kapat" onClick={() => { setError(''); setNotice('') }}>×</button></div>}

    {!groups.length ? <CommunityEmpty onCreate={() => openDialog('create')} onJoin={() => openDialog('join')} /> : <div className="community-layout">
      <aside className="surface-card group-sidebar"><div className="card-heading"><div><span className="eyebrow">TOPLULUKLARIM</span><h2>{groups.length} grup</h2></div></div><div className="group-switcher">{groups.map((group) => <button className={group.id === active?.id ? 'active' : ''} key={group.id} onClick={() => setActiveId(group.id)}><span>{group.name.slice(0, 1).toLocaleUpperCase('tr-TR')}</span><div><strong>{group.name}</strong><small>{group.member_count} üye</small></div></button>)}</div><button className="add-group" onClick={() => openDialog('join')}>+ Başka gruba katıl</button></aside>
      {active && <main className="surface-card group-main">
        <header className="group-hero"><div className="group-avatar">{active.name.slice(0, 2).toLocaleUpperCase('tr-TR')}</div><div><span className="eyebrow">ÖZEL TOPLULUK</span><h2>{active.name}</h2><p>{active.description || 'Birlikte istikrar için sakin bir alan.'}</p></div><div className="group-code"><small>Güvenli davet kodu</small><div><button aria-label="Grup kodunu kopyala" onClick={copyCode}>{active.group_code} <span>⧉</span></button>{active.owner_id === user?.id && <button className="rotate-code" aria-label="Davet kodunu yenile" disabled={busy === 'rotate'} onClick={rotateCode}><AppIcon name="refresh" /></button>}</div></div></header>
        <div className="group-privacy-note"><AppIcon name="lock" /><span><strong>Özel alan koruması açık</strong> Günlük, tefekkür ve kişisel not içerikleri hiçbir üyeyle paylaşılmaz.</span></div>
        <div className="group-tabs" role="tablist"><button role="tab" aria-selected={mode === 'members'} className={mode === 'members' ? 'active' : ''} onClick={() => setMode('members')}>Üyeler <span>{roster.length}</span></button><button role="tab" aria-selected={mode === 'chat'} className={mode === 'chat' ? 'active' : ''} onClick={() => setMode('chat')}>Grup sohbeti</button><div /><button disabled={busy === 'leave' || busy === 'delete'} className="danger-link" onClick={active.owner_id === user?.id ? remove : leave}>{active.owner_id === user?.id ? 'Grubu sil' : 'Ayrıl'}</button></div>
        {mode === 'members' ? <Roster members={roster} /> : <GroupChat messages={messages} roster={roster} userId={user?.id ?? ''} onSend={send} onLoadOlder={loadOlder} hasOlder={hasOlder} sending={busy === 'send'} endRef={endRef} />}
      </main>}
    </div>}

    {dialog && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}><section className="dialog-card community-dialog" role="dialog" aria-modal="true" aria-labelledby={dialogTitleId}><button className="dialog-close" aria-label="Pencereyi kapat" onClick={closeDialog}>×</button><span className="eyebrow">{dialog === 'create' ? 'YENİ TOPLULUK' : 'GÜVENLİ DAVET'}</span><h2 id={dialogTitleId}>{dialog === 'create' ? 'Birlikte gelişmek için alan aç' : 'Topluluğu doğrula ve katıl'}</h2><p>{dialog === 'create' ? 'Adı ve amacı anlaşılır, sıcak ve özel bir topluluk oluştur.' : 'Önce davet kodunu doğrular, katılmadan önce topluluk bilgilerini gösteririz.'}</p>{dialog === 'create' ? <CreateGroupForm busy={busy === 'create'} onSubmit={create} /> : <JoinGroupForm busy={busy === 'preview' || busy === 'join'} preview={joinPreview} onCodeChange={() => setJoinPreview(null)} onSubmit={previewOrJoin} />}</section></div>}
  </div>
}

function CommunityEmpty({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return <section className="surface-card community-empty"><div className="community-orbits"><i /><i /><i /><span>◎</span></div><span className="eyebrow">GRUBUM YOK</span><h2>İyi alışkanlıklar, iyi bir çevreyle güçlenir.</h2><p>Yakınların için özel bir topluluk oluştur veya sana gönderilen altı karakterli kodla katıl. Günlük, hata ve tefekkür içerikleri paylaşılmaz.</p><div><button className="primary-button" onClick={onCreate}>Grup oluştur</button><button className="ghost-button" onClick={onJoin}>Gruba katıl</button></div></section>
}

function CreateGroupForm({ busy, onSubmit }: { busy: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit}><label className="field"><span>Grup adı</span><input name="name" minLength={2} maxLength={60} required autoFocus placeholder="Örn. Sabah Halkası" /></label><label className="field"><span>Kısa açıklama <small>İsteğe bağlı</small></span><textarea name="description" maxLength={240} rows={3} placeholder="Bu grupta neyi birlikte sürdüreceksiniz?" /></label><div className="dialog-security"><AppIcon name="lock" /><span><strong>Kişisel kayıtların paylaşılmaz.</strong> Üyeler yalnızca adını, seviyeni, serini ve toplam XH’ını görür.</span></div><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Oluşturuluyor…' : 'Topluluğu oluştur'}</button></form>
}

function JoinGroupForm({ busy, preview, onCodeChange, onSubmit }: { busy: boolean; preview: GroupPreview | null; onCodeChange: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit}><label className="field code-field"><span>6 karakterli grup kodu</span><input name="code" minLength={6} maxLength={6} pattern="[A-Za-z0-9]{6}" required autoFocus defaultValue={preview?.group_code ?? ''} onChange={onCodeChange} placeholder="A1B2C3" autoCapitalize="characters" autoComplete="off" /></label>{preview && <article className="group-preview"><span>{preview.name.slice(0, 2).toLocaleUpperCase('tr-TR')}</span><div><small>DAVET DOĞRULANDI</small><strong>{preview.name}</strong><p>{preview.description || 'Birlikte istikrar için özel topluluk.'}</p></div><b>{preview.member_count}/100 üye</b></article>}<div className="dialog-security"><AppIcon name="shield-check" /><span><strong>Katılma işlemi kontrollüdür.</strong> Kod doğrulanmadan üyelik oluşturulmaz.</span></div><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Kontrol ediliyor…' : preview ? 'Topluluğa güvenle katıl' : 'Kodu doğrula'}</button></form>
}

function Roster({ members }: { members: RosterMember[] }) {
  if (!members.length) return <div className="empty-state"><i>◎</i><strong>Henüz başka üye yok</strong><p>Davet kodunu güvendiğin kişilerle paylaşarak topluluğunu büyütebilirsin.</p></div>
  return <div className="roster"><div className="roster-head"><span>Sıra & üye</span><span>Seviye</span><span>Seri</span><span>Toplam XH</span></div>{members.map((member, index) => { const { level } = getLevelForXP(member.xp); return <article key={member.user_id}><b className={`rank rank-${index + 1}`}>{index < 3 ? ['Ⅰ', 'Ⅱ', 'Ⅲ'][index] : index + 1}</b><img src={member.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(member.display_name)}`} alt="" /><div className="member-name"><strong>{member.display_name}</strong><small>{member.role === 'owner' ? 'Kurucu' : 'Üye'}</small></div><span className="level-badge">{level.icon} {level.name}</span><span className="streak-cell">↗ {member.streak_current}</span><strong className="xp-cell">{member.xp.toLocaleString('tr-TR')} XH</strong></article> })}</div>
}

function GroupChat({ messages, roster, userId, onSend, onLoadOlder, hasOlder, sending, endRef }: { messages: ChatMessageRow[]; roster: RosterMember[]; userId: string; onSend: (event: React.FormEvent<HTMLFormElement>) => void; onLoadOlder: () => void; hasOlder: boolean; sending: boolean; endRef: React.RefObject<HTMLDivElement | null> }) {
  const byId = new Map(roster.map((member) => [member.user_id, member]))
  return <div className="chat-shell"><div className="message-list" aria-live="polite">{hasOlder && <button className="older-messages" onClick={onLoadOlder}>Daha eski mesajları yükle</button>}{!messages.length ? <div className="empty-state"><i>◌</i><strong>Sohbet henüz sessiz</strong><p>İlk destek mesajını göndererek alanı başlat.</p></div> : messages.map((message) => { const own = message.sender_id === userId; const member = byId.get(message.sender_id); return <article className={own ? 'own' : ''} key={message.id}>{!own && <img src={member?.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(member?.display_name || 'SAH')}`} alt="" />}<div><small>{own ? 'Sen' : member?.display_name || 'Üye'} · {new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.created_at))}</small><p>{message.content}</p></div></article> })}<div ref={endRef} /></div><form className="message-form" onSubmit={onSend}><label className="sr-only" htmlFor="group-message">Topluluk mesajı</label><input id="group-message" name="message" maxLength={2000} autoComplete="off" placeholder="Topluluğa destekleyici bir mesaj yaz…" /><button type="submit" disabled={sending}>{sending ? 'Gönderiliyor…' : 'Gönder'}</button></form></div>
}

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

function friendlyCommunityError(candidate: unknown) {
  const error = candidate as { code?: string; message?: string }
  const message = error?.message ?? ''
  if (error?.code === '42501' || /permission|izin|Oturum gerekli/i.test(message)) return 'Bu işlem için güvenli oturum veya topluluk üyeliği gerekli.'
  if (error?.code === 'PGRST202' || error?.code === 'PGRST205' || /schema cache|Could not find the function|relation .* does not exist/i.test(message)) return 'Topluluk hizmeti güncelleniyor. Birkaç saniye sonra yeniden dene.'
  if (/duplicate key|already exists/i.test(message)) return 'Bu topluluğa zaten üyelik kaydın bulunuyor.'
  if (/Failed to fetch|NetworkError|fetch/i.test(message)) return 'Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.'
  if (message && message.length <= 140) return message
  return 'Topluluk işlemi tamamlanamadı. Lütfen yeniden dene.'
}
