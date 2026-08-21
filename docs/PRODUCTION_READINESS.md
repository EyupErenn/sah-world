# SAH World — Production Erişimi ve Auth Bulguları

Tarih: 21 Ağustos 2026

## Kanıtlanan kök neden

Production ana adresine yapılan anonim istek uygulama HTML'ine ulaşmadan `302 Found` yanıtıyla `vercel.com/sso-api` adresine yönleniyor. Yanıttaki `_vercel_sso_nonce` çerezi ve `X-Robots-Tag: noindex` başlığı, Vercel Deployment Protection / Vercel Authentication'ın açık olduğunu kanıtlıyor. Bu nedenle arkadaşlar giriş sayfasını dahi göremiyor; sorun bu aşamada Supabase veya React kodundan önce oluşuyor.

Doğrulama komutu:

```text
curl -I https://sah-world-309d2sjlf-eyuperenn1.vercel.app
```

Beklenen düzeltme sonrası sonuç: Vercel SSO yönlendirmesi olmadan uygulamanın `200` yanıtı veya yalnızca uygulama içi bir yönlendirme.

## Kod denetimi

- Next.js: 16.3.1; `proxy.ts` güncel cookie yenileme sınırında çalışıyor.
- OAuth callback: PKCE code exchange kullanıyor; dönüş hedefi relative allowlist ile sınırlandırıldı.
- Session: İlk kullanıcı doğrulaması Server Component'te `auth.getUser()` ile yapılıyor; tarayıcı yalnızca session durumunu eşliyor.
- Profil: `auth.users` trigger'ı idempotent. Ek olarak `ensure_my_profile()` yalnızca `auth.uid()` ile eksik profili güvenle onarıyor; client `user_id` seçemiyor.
- RLS: Özel yaşam kayıtlarında ownership `auth.uid() = user_id`; feedback doğrudan insert yerine kimliği sunucuda bağlayan rate-limited RPC kullanıyor.
- Admin: Yetki kullanıcı emailinden değil, değiştirilemeyen `app_metadata.role=admin` claim'inden kontrol ediliyor ve RPC içinde yeniden doğrulanıyor.
- Service role: Client veya kaynak kodda service-role anahtarı kullanılmıyor.

## Dış panel kontrol listesi

### Vercel

1. Project → Settings → Deployment Protection.
2. Production için Vercel Authentication'ı kapat veya yalnızca preview deployment'lara sınırla.
3. Production environment'ta `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ve `NEXT_PUBLIC_SITE_URL` değerlerini doğrula.
4. Ayar değişikliğinden sonra production deployment'ı yeniden yayınla ve anonim pencerede test et.

### Supabase

1. Authentication → Providers → Google etkin olmalı; Client ID ve Client Secret kayıtlı olmalı.
2. URL Configuration → Site URL: `https://sah-world-309d2sjlf-eyuperenn1.vercel.app`
3. Redirect URLs: `https://sah-world-309d2sjlf-eyuperenn1.vercel.app/auth/callback` ve yerel geliştirme için `http://localhost:3000/auth/callback`.

### Google Cloud

1. OAuth consent screen yayın durumunu doğrula. Test modundaysa yalnızca tanımlı test kullanıcıları giriş yapabilir.
2. OAuth Web Client Authorized JavaScript origin: `https://sah-world-309d2sjlf-eyuperenn1.vercel.app`
3. Authorized redirect URI: Supabase panelindeki Google provider callback URL'si (`https://<project-ref>.supabase.co/auth/v1/callback`).
4. Uygulama adı, destek e-postası ve consent screen alanlarını tamamla.

## Henüz doğrulanmamış noktalar

- Vercel hesabında oturum açılmadığı için Deployment Protection henüz değiştirilemedi.
- İki ayrı gerçek Google hesabı ve e-posta OTP ile uçtan uca production testi, erişim açılmadan yapılamaz.
- Google Provider/consent screen dış ayarları dashboard erişimi olmadan yapılmış kabul edilmemelidir.
