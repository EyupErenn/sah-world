'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// ============================================================
// SAH WORLD — Cinematic Login Screen
// Primary: Email OTP (Supabase native, ücretsiz)
// Secondary: Phone + Google → "Yakında" (disabled)
// ============================================================

type Step = 'email' | 'otp';

export default function LoginScreen() {
  const { setAuthError, authError } = useAuthStore();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Yıldız arkaplanı (stable ref — her render'da yeniden üretilmez)
  const stars = useRef(
    Array.from({ length: 90 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.2 + 0.4,
      opacity: Math.random() * 0.65 + 0.1,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 7,
    }))
  );

  // Geri sayım (yeniden gönder)
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // OTP kutusu: ilk kutuya otomatik focus
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    }
  }, [step]);

  // ── Email OTP gönder ────────────────────────────────────
  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      useAuthStore.getState().setAuthError('Geçerli bir e-posta adresi girin.');
      return;
    }
    setIsSending(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep('otp');
      setCountdown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bir hata oluştu.';
      setAuthError(msg);
    } finally {
      setIsSending(false);
    }
  };

  // ── Email OTP doğrula ───────────────────────────────────
  const handleVerifyOtp = async () => {
    const token = otp.join('');
    if (token.length !== 6) {
      setAuthError('6 haneli kodu eksiksiz girin.');
      return;
    }
    setIsVerifying(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: 'email',
      });
      if (error) throw error;
      // onAuthStateChange (AuthProvider) → SIGNED_IN → VillageWorld mount
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kod hatalı veya süresi dolmuş.';
      setAuthError(msg);
      setIsVerifying(false);
    }
  };

  // ── OTP kutu yönetimi ───────────────────────────────────
  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'Enter') handleVerifyOtp();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (digits.length === 6) {
      setOtp(digits.split(''));
      setTimeout(() => otpRefs.current[5]?.focus(), 10);
    }
  };

  const isOtpFull = otp.join('').length === 6;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#08091a] select-none">

      {/* ── Yıldız arkaplanı ─────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {stars.current.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
              animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* ── Gradient ışık halkaları ───────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 85%, rgba(79,70,229,0.22) 0%, transparent 70%),' +
            'radial-gradient(ellipse 40% 40% at 18% 18%, rgba(124,58,237,0.12) 0%, transparent 60%),' +
            'radial-gradient(ellipse 35% 35% at 82% 12%, rgba(6,182,212,0.09) 0%, transparent 60%)',
        }}
      />

      {/* ── Köy silüeti (SVG) ─────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-52 pointer-events-none overflow-hidden" aria-hidden>
        <svg viewBox="0 0 1440 200" className="absolute bottom-0 w-full" preserveAspectRatio="none">
          <path
            d="M0,180 L80,180 L80,140 L100,140 L100,120 L115,120 L115,100 L130,100 L130,80 L145,80 L145,100 L160,100 L160,120 L175,120 L175,140 L195,140 L195,180
               L240,180 L240,150 L260,150 L260,130 L280,130 L280,150 L300,150 L300,180
               L380,180 L380,160 L400,160 L400,140 L415,140 L415,115 L422,108 L429,115 L429,140 L445,140 L445,160 L465,160 L465,180
               L560,180 L560,155 L580,155 L580,135 L600,135 L600,155 L620,155 L620,180
               L720,180 L720,148 L740,148 L740,128 L755,128 L755,108 L762,100 L769,108 L769,128 L784,128 L784,148 L804,148 L804,180
               L900,180 L900,160 L920,160 L920,140 L940,140 L940,160 L960,160 L960,180
               L1060,180 L1060,145 L1080,145 L1080,125 L1100,125 L1100,145 L1120,145 L1120,180
               L1200,180 L1200,155 L1220,155 L1220,135 L1235,135 L1235,110 L1243,102 L1251,110 L1251,135 L1266,135 L1266,155 L1286,155 L1286,180
               L1440,180 L1440,200 L0,200 Z"
            fill="rgba(79,70,229,0.07)"
          />
        </svg>
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent)' }}
        />
      </div>

      {/* ── Ana Login Kartı ───────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md mx-auto px-6 py-8">

        {/* Logo + başlık */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 border border-white/15"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #06b6d4 100%)',
              boxShadow: '0 0 64px rgba(99,102,241,0.45), 0 20px 48px rgba(0,0,0,0.45)',
            }}
          >
            <span className="text-4xl font-black text-white">S</span>
          </div>

          <h1
            className="text-4xl font-black tracking-widest mb-1.5"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #67e8f9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SAH WORLD
          </h1>
          <p className="text-slate-500 text-sm tracking-wide font-light">
            Hayat Yolculuğun &amp; Manevi Evrenin
          </p>
        </div>

        {/* Kart */}
        <div
          className="rounded-3xl p-8 border border-white/8"
          style={{
            background: 'rgba(13,14,32,0.82)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            boxShadow: '0 32px 72px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >

          {/* ════ ADIM 1: E-posta ════════════════════════════ */}
          {step === 'email' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Hoş Geldin, Yolcu</h2>
                <p className="text-slate-400 text-sm">
                  Köye giriş için e-posta adresinle devam et. Sana 6 haneli bir kod göndereceğiz.
                </p>
              </div>

              {/* E-posta inputu */}
              <div className="space-y-2">
                <label
                  htmlFor="email-input"
                  className="block text-xs font-semibold text-slate-400 uppercase tracking-wider"
                >
                  E-posta Adresi
                </label>
                <input
                  id="email-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="ornek@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                  className="w-full px-4 py-3.5 rounded-xl border border-white/10 text-white text-base placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
                  style={{ background: 'rgba(25,26,52,0.85)' }}
                />
              </div>

              {/* Hata mesajı */}
              {authError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  <span className="mt-0.5 flex-shrink-0">⚠️</span>
                  <span>{authError}</span>
                </div>
              )}

              {/* Ana buton: E-posta OTP */}
              <button
                id="send-otp-btn"
                onClick={handleSendOtp}
                disabled={isSending || !email.trim()}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: isSending || !email.trim()
                    ? 'rgba(79,70,229,0.35)'
                    : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  boxShadow: isSending || !email.trim()
                    ? 'none'
                    : '0 8px 32px rgba(99,102,241,0.38)',
                }}
              >
                {isSending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Gönderiliyor...
                  </span>
                ) : '✉️ E-posta Kodu Gönder'}
              </button>

              {/* Hızlı Misafir Girişi */}
              <button
                id="guest-login-btn"
                type="button"
                onClick={() => {
                  const mockUser = { id: 'guest-user-123', email: 'guest@sah.world' };
                  const mockSession = { user: mockUser, access_token: 'mock-token', expires_in: 3600, token_type: 'bearer' } as any;
                  const mockProfile = {
                    id: 'guest-user-123',
                    display_name: 'Seyyah Yolcu',
                    avatar_url: null,
                    vehicle_type: 'car',
                    xp: 240,
                    streak_current: 3,
                    streak_last_date: new Date().toISOString().split('T')[0],
                    total_zikir: 99,
                    badges: ['first_step', 'sukur_master'],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  useAuthStore.getState().setSession(mockSession);
                  useAuthStore.getState().setUser(mockUser as any);
                  useAuthStore.getState().setProfile(mockProfile);
                  useAuthStore.getState().setIsAuthLoading(false);
                }}
                className="w-full py-3 rounded-xl text-emerald-300 hover:text-white font-bold text-xs border border-emerald-500/30 hover:border-emerald-400 bg-emerald-950/40 hover:bg-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                <span>🚀</span>
                <span>Misafir Olarak Köyü Keşfet (Hızlı Giriş)</span>
              </button>

              {/* Ayraç */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <span className="text-slate-600 text-xs">veya</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>

              {/* Yakında: Google */}
              <DisabledButton icon={
                <svg width="17" height="17" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
              } label="Google ile Giriş Yap" />

              {/* Yakında: Telefon */}
              <DisabledButton icon={<span className="text-base">📱</span>} label="Telefon ile Giriş Yap" />
            </div>
          )}

          {/* ════ ADIM 2: OTP kodu ═══════════════════════════ */}
          {step === 'otp' && (
            <div className="space-y-6">
              {/* Geri */}
              <button
                onClick={() => {
                  setStep('email');
                  setOtp(['', '', '', '', '', '']);
                  setAuthError(null);
                }}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors cursor-pointer"
              >
                ← Geri
              </button>

              <div>
                <h2 className="text-xl font-bold text-white mb-1">E-posta Kodunu Gir</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  <span
                    className="font-mono font-semibold"
                    style={{ color: '#a5b4fc' }}
                  >
                    {email}
                  </span>
                  {' '}adresine gönderilen{' '}
                  <strong className="text-white">6 haneli kodu</strong> girin.
                  <br />
                  <span className="text-slate-500 text-xs">Spam/gereksiz klasörünü kontrol etmeyi unutmayın.</span>
                </p>
              </div>

              {/* 6 ayrı OTP kutusu */}
              <div className="flex gap-2.5 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpRefs.current[idx] = el; }}
                    id={`otp-box-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-14 text-center text-2xl font-black rounded-xl border-2 transition-all focus:outline-none"
                    style={{
                      background: 'rgba(25,26,52,0.9)',
                      borderColor: digit
                        ? 'rgba(99,102,241,0.85)'
                        : 'rgba(255,255,255,0.10)',
                      color: digit ? '#a5b4fc' : '#f8fafc',
                      boxShadow: digit ? '0 0 14px rgba(99,102,241,0.28)' : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Hata */}
              {authError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  <span className="mt-0.5">⚠️</span>
                  <span>{authError}</span>
                </div>
              )}

              {/* Doğrula butonu */}
              <button
                id="verify-otp-btn"
                onClick={handleVerifyOtp}
                disabled={isVerifying || !isOtpFull}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: isVerifying || !isOtpFull
                    ? 'rgba(79,70,229,0.35)'
                    : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  boxShadow: isVerifying || !isOtpFull
                    ? 'none'
                    : '0 8px 32px rgba(99,102,241,0.38)',
                }}
              >
                {isVerifying ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Doğrulanıyor...
                  </span>
                ) : '✅ Köye Giriş Yap'}
              </button>

              {/* Yeniden gönder */}
              <div className="text-center">
                {countdown > 0 ? (
                  <span className="text-slate-600 text-sm">
                    Kodu yeniden gönder ({countdown}s)
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setOtp(['', '', '', '', '', '']);
                      setAuthError(null);
                      handleSendOtp();
                    }}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Kodu Yeniden Gönder
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Alt not */}
        <p className="text-center text-slate-700 text-xs mt-6">
          Giriş yaparak Kullanım Koşulları&apos;nı kabul etmiş olursun.
        </p>
      </div>

      {/* ── Twinkle animasyon ────────────────────────────── */}
      <style>{`
        @keyframes twinkle {
          0%   { opacity: 0.1; transform: scale(0.75); }
          100% { opacity: 0.95; transform: scale(1.25); }
        }
      `}</style>
    </div>
  );
}

// ── Disabled "Yakında" butonu ────────────────────────────
function DisabledButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      disabled
      className="w-full py-3 rounded-xl text-sm font-medium border flex items-center justify-center gap-2.5 cursor-not-allowed"
      style={{
        background: 'rgba(255,255,255,0.025)',
        borderColor: 'rgba(255,255,255,0.07)',
        color: 'rgba(255,255,255,0.25)',
      }}
      title="Yakında eklenecek"
    >
      {icon}
      <span>{label}</span>
      <span
        className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
      >
        Yakında
      </span>
    </button>
  );
}
