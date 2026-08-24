'use client'
/* eslint-disable @next/next/no-img-element */

import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import LoginScreen from '@/components/auth/LoginScreen'
import { AppIcon } from '@/components/ui/AppIcon'
import { useAuthStore } from '@/store/useAuthStore'
import { useJourneyStore } from '@/store/useJourneyStore'
import { useFocusTimerStore } from '@/store/useFocusTimerStore'
import { getLevelForXP } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'
import type { SectionKey } from './SectionView'
import WelcomeGuide from './WelcomeGuide'
import CommandPalette from './CommandPalette'
import MilestoneCelebration, { type Milestone } from './MilestoneCelebration'

const DashboardView = dynamic(() => import('./DashboardView'), { loading: () => <ViewSkeleton /> })
const ReportsView = dynamic(() => import('./ReportsView'), { loading: () => <ViewSkeleton /> })
const CommunityView = dynamic(() => import('./CommunityView'), { loading: () => <ViewSkeleton /> })
const DailyWisdomWheel = dynamic(() => import('./DailyWisdomWheel'), { loading: () => <ViewSkeleton /> })
const SectionView = dynamic(() => import('./SectionView'), { loading: () => <ViewSkeleton /> })
const FocusTimerView = dynamic(() => import('./FocusTimerView'), { loading: () => <ViewSkeleton /> })

type ViewKey = 'dashboard' | 'community' | 'reports' | 'daily-wheel' | 'focus' | SectionKey
type NavigationItem = { id: ViewKey; label: string; icon: string }

const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  { label: 'Ana alan', items: [
    { id: 'dashboard', label: 'Evrenim', icon: 'home-2' },
    { id: 'focus', label: 'Odaklanma Zamanlayıcısı', icon: 'target-arrow' },
    { id: 'journal', label: 'Günlük', icon: 'notebook' },
    { id: 'daily-wheel', label: 'Bugünün Çarkı', icon: 'refresh' },
  ] },
  { label: 'Manevi kayıtlar', items: [
    { id: 'quran', label: 'Kur’an', icon: 'book-2' },
    { id: 'hadis', label: 'Hadis', icon: 'quote' },
    { id: 'sukur', label: 'Şükür', icon: 'sparkles' },
    { id: 'lessons', label: 'Hatalar ve Dersler', icon: 'history' },
    { id: 'mescidim', label: 'Mescidim', icon: 'building-mosque' },
  ] },
  { label: 'Planlama ve gelişim', items: [
    { id: 'matrix', label: 'Matris', icon: 'layout-grid' },
    { id: 'reports', label: 'Raporlarım', icon: 'chart-histogram' },
    { id: 'depot', label: 'Ahiret Deposu', icon: 'archive' },
  ] },
  { label: 'Sosyal', items: [
    { id: 'community', label: 'Topluluk', icon: 'users-group' },
  ] },
]

const viewLabels = Object.fromEntries(navigationGroups.flatMap((group) => group.items.map((item) => [item.id, item.label]))) as Record<ViewKey, string>

export default function SahApp({ initialUser, initialProfile }: { initialUser: User | null; initialProfile: Profile | null }) {
  const { session, user, isAuthLoading, profile } = useAuthStore()
  const store = useJourneyStore()
  const [view, setView] = useState<ViewKey>('dashboard')
  const [moreOpen, setMoreOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [milestone, setMilestone] = useState<Milestone>(null)
  const milestoneArmed = useRef(false)
  const milestoneSnapshot = useRef({ journal: store.journal.length, streak: store.streak.current, level: getLevelForXP(store.xp).level.name })
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const { level } = getLevelForXP(store.xp)
  const journalCount = store.journal.length
  const streakCurrent = store.streak.current
  const currentLevelName = level.name

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('focus') === '1') {
      const timer = window.setTimeout(() => setView('focus'), 0)
      return () => window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const openFocus = () => {
      setView('focus')
      setMoreOpen(false)
      setProfileOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('sah:open-focus', openFocus)
    return () => window.removeEventListener('sah:open-focus', openFocus)
  }, [])

  useEffect(() => {
    const showFocus = () => {
      setView('focus')
      setMoreOpen(false)
      setProfileOpen(false)
    }
    const initialSync = window.setTimeout(() => {
      if (useFocusTimerStore.getState().isFullscreen) showFocus()
    }, 0)
    const unsubscribe = useFocusTimerStore.subscribe((state, previous) => {
      if (state.isFullscreen && !previous.isFullscreen) showFocus()
    })
    return () => {
      window.clearTimeout(initialSync)
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [])

  useEffect(() => {
    const saved = window.localStorage.getItem('sah-theme')
    const nextTheme = saved === 'dark' ? 'dark' : 'light'
    document.documentElement.dataset.theme = nextTheme
    const timer = window.setTimeout(() => setTheme(nextTheme), 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen((value) => !value) }
    }
    document.addEventListener('keydown', shortcut)
    return () => document.removeEventListener('keydown', shortcut)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      milestoneArmed.current = true
    }, 1500)
    return () => window.clearTimeout(timer)
  }, []) // İlk veri eşitlemesini kutlama olarak göstermeyiz.

  useEffect(() => {
    const current = { journal: journalCount, streak: streakCurrent, level: currentLevelName }
    const previous = milestoneSnapshot.current
    if (milestoneArmed.current && !milestone) {
      let next: Exclude<Milestone, null> | null = null
      if (previous.journal < 10 && current.journal >= 10) next = { id: 'journal-10', eyebrow: 'BİR DÖNÜM NOKTASI', title: 'Kendine on kez alan açtın.', message: 'On günlük kaydı; hızdan çok, tekrar tekrar kendine dönmeyi seçtiğini gösteriyor.', icon: 'notebook' }
      else if ([7, 30, 100].includes(current.streak) && previous.streak < current.streak) next = { id: `streak-${current.streak}`, eyebrow: 'İSTİKRARIN GÖRÜNÜR OLDU', title: `${current.streak} günlük seri.`, message: 'Küçük adımların birbirine eklenerek nasıl bir ritim kurduğunu fark et.', icon: 'flame' }
      else if (previous.level !== current.level) next = { id: `level-${current.level}`, eyebrow: 'YENİ BİR EVRE', title: `${current.level} seviyesine ulaştın.`, message: 'Bu seviye yalnızca uygulamadaki istikrarının yeni bir görünümüdür. Yolculuğun sana ait.', icon: 'sparkles' }
      if (next && !window.localStorage.getItem(`sah-milestone-${next.id}`)) {
        window.localStorage.setItem(`sah-milestone-${next.id}`, '1')
        setMilestone(next)
      }
    }
    milestoneSnapshot.current = current
  }, [currentLevelName, journalCount, milestone, streakCurrent])

  const closeSearch = useCallback(() => setSearchOpen(false), [])

  const activeUser = user || initialUser
  const activeProfile = profile || initialProfile
  if (isAuthLoading && !initialUser) return <AppLoading />
  if (!session && !activeUser) return <LoginScreen />

  const navigate = (next: string) => {
    setView(next as ViewKey)
    setMoreOpen(false)
    setProfileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.dataset.theme = next
    window.localStorage.setItem('sah-theme', next)
  }
  const openPage = (path: string) => {
    setMoreOpen(false)
    setProfileOpen(false)
    window.location.assign(path)
  }
  const avatarUrl = activeProfile?.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(activeProfile?.display_name || 'Yolcu')}`

  return (
    <div className={`core-app ${view === 'focus' ? 'focus-mode' : ''}`}>
      {activeProfile?.created_at && <WelcomeGuide createdAt={activeProfile.created_at} onStart={() => navigate('journal')} />}

      <aside className="app-sidebar" aria-label="Ana navigasyon">
        <button className="brand sidebar-brand" onClick={() => navigate('dashboard')} aria-label="SAH ana sayfa">
          <span className="brand-mark">S</span>
          <span><strong>SAH</strong><small>Kişisel gelişim alanı</small></span>
        </button>

        <nav className="sidebar-nav">
          {navigationGroups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}>
                  <AppIcon name={item.icon} /><span>{item.label}</span>
                </button>
              ))}
            </section>
          ))}
        </nav>

        <div className="sidebar-support">
          <button onClick={() => openPage('/feedback')}><AppIcon name="message-heart" /><span>Görüş ve Öneri</span></button>
          <p><AppIcon name="lock" /> Özel kayıtların yalnızca sana görünür.</p>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-header">
          <button className="mobile-brand" onClick={() => navigate('dashboard')} aria-label="SAH ana sayfa"><span className="brand-mark">S</span><strong>SAH</strong></button>
          <div className="route-context"><span>SAH World</span><strong>{viewLabels[view]}</strong></div>
          <div className="header-actions" ref={profileMenuRef}>
            <button className="global-search-button" onClick={() => setSearchOpen(true)} aria-label="Her yerde ara"><AppIcon name="search" /><span>Her yerde ara</span><kbd>Ctrl K</kbd></button>
            <button className="header-feedback" onClick={() => openPage('/feedback')}><AppIcon name="message-heart" /><span>Görüş bırak</span></button>
            <button className="profile-button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} aria-haspopup="menu">
              <img src={avatarUrl} alt="" />
              <span><strong>{activeProfile?.display_name || 'Yolcu'}</strong><small>{level.name} · {store.xp} XP</small></span>
              <AppIcon name="chevron-down" />
            </button>
            {profileOpen && <div className="profile-popover" role="menu">
              <div className="profile-summary"><img src={avatarUrl} alt="" /><span><strong>{activeProfile?.display_name || 'Yolcu'}</strong><small>{store.streak.current} günlük seri · {level.name}</small></span></div>
              <button role="menuitem" onClick={() => navigate('reports')}><AppIcon name="chart-histogram" /> Gelişim raporlarım</button>
              <button role="menuitem" onClick={() => navigate('community')}><AppIcon name="users-group" /> Topluluklarım</button>
              <button role="menuitem" onClick={toggleTheme}><AppIcon name={theme === 'light' ? 'moon' : 'sun'} /> {theme === 'light' ? 'Gece görünümü' : 'Aydınlık görünüm'}</button>
              <button role="menuitem" onClick={() => openPage('/feedback')}><AppIcon name="message-heart" /> Görüş ve öneri</button>
              {activeUser?.app_metadata?.role === 'admin' && <button role="menuitem" onClick={() => openPage('/admin/feedback')}><AppIcon name="shield-check" /> Geri bildirim yönetimi</button>}
              <button className="signout" role="menuitem" onClick={() => void supabase.auth.signOut()}><AppIcon name="logout" /> Oturumu kapat</button>
            </div>}
          </div>
        </header>

        <main className="app-main" id="main-content">
          <AnimatePresence mode="wait" initial={false}><motion.div key={view} className="view-motion-shell" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .2, ease: [0.22, 1, 0.36, 1] }}>
            {view === 'dashboard' ? <DashboardView onNavigate={navigate} /> : view === 'reports' ? <ReportsView /> : view === 'community' ? <CommunityView /> : view === 'daily-wheel' ? <DailyWisdomWheel /> : view === 'focus' ? <FocusTimerView onExit={() => navigate('dashboard')} /> : <SectionView section={view} onNavigate={navigate} />}
          </motion.div></AnimatePresence>
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobil navigasyon">
        {[
          { id: 'dashboard', label: 'Evrenim', icon: 'home-2' }, { id: 'journal', label: 'Günlük', icon: 'notebook' },
          { id: 'matrix', label: 'Matris', icon: 'layout-grid' }, { id: 'community', label: 'Topluluk', icon: 'users-group' },
        ].map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}><AppIcon name={item.icon} /><span>{item.label}</span></button>)}
        <button className={moreOpen ? 'active' : ''} onClick={() => setMoreOpen((value) => !value)} aria-expanded={moreOpen}><AppIcon name="dots" /><span>Daha</span></button>
      </nav>

      {moreOpen && <div className="mobile-more" role="dialog" aria-label="Diğer bölümler">
        {navigationGroups.flatMap((group) => group.items).filter((item) => !['dashboard', 'journal', 'matrix', 'community'].includes(item.id)).map((item) => <button key={item.id} onClick={() => navigate(item.id)}><AppIcon name={item.icon} /><span>{item.label}</span></button>)}
        <button onClick={() => openPage('/feedback')}><AppIcon name="message-heart" /><span>Görüş</span></button>
        {activeUser?.app_metadata?.role === 'admin' && <button onClick={() => openPage('/admin/feedback')}><AppIcon name="shield-check" /><span>Yönetim</span></button>}
      </div>}
      <CommandPalette open={searchOpen} onClose={closeSearch} onNavigate={navigate} />
      <MilestoneCelebration milestone={milestone} onClose={() => setMilestone(null)} />
    </div>
  )
}

function AppLoading() {
  return <main className="app-loader" aria-busy="true" aria-live="polite"><span className="brand-mark">S</span><div className="skeleton-stack"><i /><i /><i /></div><p>Güvenli alanın hazırlanıyor…</p></main>
}

function ViewSkeleton() {
  return <div className="view-skeleton" aria-busy="true" aria-live="polite"><span /><span /><div><i /><i /><i /></div><p>İçerik hazırlanıyor…</p></div>
}
