'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getGoogleAuthAvailability, supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import PurposeEquation from '@/components/core/PurposeEquation'
import CardioidMotif from './CardioidMotif'

type Step = 'email' | 'otp'
type GoogleAvailability = 'checking' | 'enabled' | 'disabled' | 'unknown'
const emptyOtp = () => ['', '', '', '', '', '']

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('provider') && message.includes('enabled')) return 'Google ile giriş şu anda kullanılamıyor. E-posta koduyla devam edebilir veya daha sonra yeniden deneyebilirsiniz.'
  if (message.includes('rate') || message.includes('limit')) return 'Çok sık deneme yapıldı. Lütfen kısa bir süre sonra tekrar deneyin.'
  if (message.includes('expired')) return 'Kodun süresi dolmuş. Yeni bir kod isteyin.'
  if (message.includes('invalid')) return 'Kod doğrulanamadı. Rakamları kontrol edip yeniden deneyin.'
  return 'Giriş işlemi tamamlanamadı. Lütfen bağlantınızı kontrol edip yeniden deneyin.'
}

export default function LoginScreen() {
  const { setAuthError, authError } = useAuthStore()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(emptyOtp)
  const [countdown, setCountdown] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [googleAvailability, setGoogleAvailability] = useState<GoogleAvailability>('checking')
  const [requiresLocalhost, setRequiresLocalhost] = useState(false)
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    let active = true
    void getGoogleAuthAvailability().then((isEnabled) => {
      if (!active) return
      setGoogleAvailability(isEnabled === true ? 'enabled' : isEnabled === false ? 'disabled' : 'unknown')
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    if (step === 'otp') window.setTimeout(() => otpRefs.current[0]?.focus(), 80)
  }, [step])

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    setAuthError(null)
    setRequiresLocalhost(false)

    const isInsecureDevelopmentHost = process.env.NODE_ENV === 'development'
      && window.location.protocol !== 'https:'
      && !['localhost', '127.0.0.1'].includes(window.location.hostname)

    if (isInsecureDevelopmentHost) {
      setRequiresLocalhost(true)
      setAuthError('Google güvenlik doğrulaması yerel ağ adresinde çalışmaz. Aynı uygulamayı localhost üzerinden açıp yeniden deneyin.')
      setIsGoogleLoading(false)
      return
    }

    const providerEnabled = await getGoogleAuthAvailability()
    if (providerEnabled === false) {
      setGoogleAvailability('disabled')
      setAuthError('Google girişi Supabase projesinde henüz etkin değil. Ayar tamamlanana kadar e-posta koduyla güvenle giriş yapabilirsiniz.')
      setIsGoogleLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) throw error
    } catch (error) {
      setAuthError(friendlyAuthError(error))
      setIsGoogleLoading(false)
    }
  }

  const handleSendOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setAuthError('Geçerli bir e-posta adresi girin.')
      return
    }
    setIsSending(true)
    setAuthError(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: normalizedEmail, options: { shouldCreateUser: true } })
      if (error) throw error
      setStep('otp')
      setCountdown(60)
    } catch (error) {
      setAuthError(friendlyAuthError(error))
    } finally {
      setIsSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    const token = otp.join('')
    if (token.length !== 6) return setAuthError('6 haneli kodu eksiksiz girin.')
    setIsVerifying(true)
    setAuthError(null)
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'email' })
      if (error) throw error
    } catch (error) {
      setAuthError(friendlyAuthError(error))
      setIsVerifying(false)
    }
  }

  const updateOtp = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    setOtp((current) => current.map((digit, itemIndex) => itemIndex === index ? value : digit))
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const pasteOtp = (event: React.ClipboardEvent) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (digits.length !== 6) return
    event.preventDefault()
    setOtp(digits.split(''))
    otpRefs.current[5]?.focus()
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-labelledby="login-title">
        <div className="login-brand"><span>S</span><strong>SAH</strong></div>
        <div className="login-story-copy">
          <h1 id="login-title">İyi alışkanlıkların,<br /><em>kendi evrenini kurar.</em></h1>
          <p>Günlüğünü, hedeflerini ve manevi yolculuğunu tek bir sakin alanda takip et. Her kayıt ilerlemene dönüşsün.</p>
        </div>
        <CardioidMotif />
        <PurposeEquation compact />
        <ul className="login-trust-list" aria-label="Platform özellikleri">
          <li><span>✓</span> Sekiz yaşam alanı</li><li><span>✓</span> XH ve gelişim raporları</li><li><span>✓</span> Verilerin sana özel</li>
        </ul>
      </section>

      <section className="login-panel" aria-label="Giriş formu">
        <div className="login-card">
          {step === 'email' ? <>
            <div className="login-card-heading"><p className="eyebrow">Tekrar hoş geldin</p><h2>SAH hesabına giriş yap</h2><p>İlerlemen güvenle saklansın ve tüm cihazlarında seninle kalsın.</p></div>
            <button className="google-button" type="button" onClick={handleGoogleLogin} disabled={isGoogleLoading || isSending || googleAvailability === 'checking'} aria-busy={isGoogleLoading || googleAvailability === 'checking'}>
              <GoogleMark /><span>{googleAvailability === 'checking' ? 'Google girişi kontrol ediliyor…' : isGoogleLoading ? 'Google’a yönlendiriliyor…' : 'Google ile devam et'}</span>{(isGoogleLoading || googleAvailability === 'checking') && <Spinner />}
            </button>
            {googleAvailability === 'disabled' && <p className="google-availability-note"><span aria-hidden>i</span> Google bağlantısı yönetici ayarı bekliyor. E-posta koduyla giriş kesintisiz çalışır.</p>}
            <div className="login-separator"><span>E-posta kodu ile devam et</span></div>
            <label className="login-label" htmlFor="email-input">E-posta adresi</label>
            <div className="login-email-row">
              <input id="email-input" type="email" inputMode="email" autoComplete="email" placeholder="ornek@email.com" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void handleSendOtp()} />
              <button type="button" onClick={handleSendOtp} disabled={isSending || !email.trim()} aria-busy={isSending}>{isSending ? <Spinner /> : 'Kod gönder'}</button>
            </div>
            <p className="login-privacy-note"><span aria-hidden>⌁</span> Şifre istemiyoruz. Tek kullanımlık kod veya Google hesabınla güvenli giriş yaparsın.</p>
            {authError && <div className="login-error" role="alert"><span aria-hidden>!</span><div>{authError}{requiresLocalhost && <a href="http://localhost:3000">localhost:3000 adresini aç</a>}</div></div>}
            {process.env.NODE_ENV === 'development' && <DevelopmentGuestButton />}
          </> : <>
            <button className="login-back" type="button" onClick={() => { setStep('email'); setOtp(emptyOtp()); setAuthError(null) }}>← E-posta adresini değiştir</button>
            <div className="login-card-heading"><p className="eyebrow">Son bir adım</p><h2>Gelen kutunu kontrol et</h2><p><strong>{email}</strong> adresine gönderdiğimiz 6 haneli kodu gir.</p></div>
            <div className="otp-row" onPaste={pasteOtp}>
              {otp.map((digit, index) => <input key={index} ref={(element) => { otpRefs.current[index] = element }} aria-label={`${index + 1}. kod hanesi`} inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={1} value={digit} onChange={(event) => updateOtp(index, event.target.value)} onKeyDown={(event) => {
                if (event.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus()
                if (event.key === 'Enter') void handleVerifyOtp()
              }} />)}
            </div>
            {authError && <div className="login-error" role="alert"><span aria-hidden>!</span>{authError}</div>}
            <button className="sah-button-primary login-submit" type="button" onClick={handleVerifyOtp} disabled={isVerifying || otp.join('').length !== 6} aria-busy={isVerifying}>{isVerifying ? <><Spinner /> Doğrulanıyor…</> : 'Giriş yap'}</button>
            <div className="login-resend">{countdown > 0 ? <span>Yeni kodu {countdown} saniye sonra isteyebilirsin.</span> : <button type="button" onClick={() => { setOtp(emptyOtp()); void handleSendOtp() }}>Kodu yeniden gönder</button>}</div>
          </>}
          <p className="login-legal">Devam ederek <Link href="/kullanim-kosullari">Kullanım Koşulları</Link> ve <Link href="/gizlilik">Gizlilik Politikası</Link>’nı kabul etmiş olursun.</p>
        </div>
      </section>
    </main>
  )
}

function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33Z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33A5.4 5.4 0 0 1 9 3.58Z"/></svg>
}

function Spinner() { return <span className="login-spinner" aria-hidden /> }

function DevelopmentGuestButton() {
  return <button className="dev-guest-button" type="button" onClick={() => {
    const mockUser = { id: 'guest-user-123', email: 'guest@sah.world' }
    useAuthStore.getState().setSession({ user: mockUser, access_token: 'mock-token', expires_in: 3600, token_type: 'bearer' } as never)
    useAuthStore.getState().setUser(mockUser as never)
    useAuthStore.getState().setProfile({ id: mockUser.id, display_name: 'Geliştirme Misafiri', avatar_url: null, role: 'user', vehicle_type: 'car', xp: 240, streak_current: 3, streak_last_date: new Date().toISOString().slice(0, 10), total_zikir: 99, badges: ['first_step'], location_city: null, location_country: null, location_lat: null, location_lng: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    useAuthStore.getState().setIsAuthLoading(false)
  }}>DEV: Misafir görünümü</button>
}
