# Google Auth + Geri Bildirim Yayınlama Rehberi

Bu doküman kodla otomatik yapılan işleri, yalnızca Google/Supabase panellerinde yapılabilen güvenli ayarlardan ayırır. Google `Client Secret`, Supabase `service_role` anahtarı veya yönetici anahtarı bu repoya ya da `NEXT_PUBLIC_*` değişkenlerine yazılmaz.

## Uygulanan mimari

- Tarayıcı ve sunucu Supabase istemcileri `@supabase/ssr` kullanır. Oturum cookie üzerinden paylaşılır ve PKCE kodu `/auth/callback` rotasında değiştirilir.
- `next` hedefi göreli ve izinli yollarla sınırlandırılır; dış adrese yönlendirme kabul edilmez.
- E-posta OTP akışı korunmuştur. Google, giriş ekranındaki birincil seçenek olarak `signInWithOAuth({ provider: 'google' })` kullanır.
- Yeni kullanıcı profil trigger'ı Google'ın ilk girişte sağladığı `full_name/name/avatar_url` metadatasını kullanır. `ON CONFLICT DO NOTHING` nedeniyle kullanıcı sonradan profilini düzenlediğinde OAuth girişi bu değerleri ezmez.
- Supabase, aynı **doğrulanmış** e-posta adresine sahip Google ve e-posta kimliklerini otomatik olarak aynı kullanıcıya bağlar. Uygulama manuel kimlik birleştirme yapmaz.
- Geri bildirim ekleme doğrudan tablo `INSERT` yetkisiyle yapılmaz. `submit_feedback` RPC'si oturum kimliğini kendisi bağlar, alanları tekrar doğrular ve 10 saniye/10 dakika hız sınırı uygular.
- Yönetici yetkisi istemci e-postasına göre değil, doğrulanmış JWT içindeki `app_metadata.role = admin` iddiasına göre kontrol edilir. Server Component/Action ve RLS/RPC aynı kuralı uygular.

## 1. Google Auth Platform ayarı (manuel ve zorunlu)

1. [Google Auth Platform](https://console.cloud.google.com/auth/overview) içinde proje oluşturun/seçin.
2. **Branding** bölümünde uygulama adı `SAH`, destek e-postası, logo, ana sayfa, gizlilik ve kullanım koşulu URL'lerini girin.
3. **Audience** bölümünde geliştirme sırasında `External / Testing` seçip test kullanıcılarını ekleyin. Üretim için uygun olduğunda `In production` durumuna alın.
4. **Data Access** içinde yalnızca şu standart kapsamları kullanın: `openid`, `userinfo.email`, `userinfo.profile`. Uygulamanın Google Drive vb. verilere erişmesi gerekmez.
5. **Clients → Create client → Web application** ile bir istemci oluşturun.
6. **Authorized JavaScript origins** alanına şunları ekleyin:
   - `http://localhost:3000`
   - `https://sah-world-309d2sjlf-eyuperenn1.vercel.app`
   - Vercel'de sonradan bağlanan özel üretim domaini varsa onun yalnızca origin kısmı
7. **Authorized redirect URIs** alanına uygulama adresini değil, bu Supabase callback adresini ekleyin:
   - `https://xintudrmubjtvdbzvlao.supabase.co/auth/v1/callback`
8. Oluşan Client ID ve Client Secret'ı güvenli biçimde saklayın. Bunlar Vercel istemci değişkeni değildir.

Google marka doğrulaması ayrı bir dış süreçtir ve birkaç iş günü sürebilir. Kod değişikliği bu doğrulamayı tamamlayamaz.

## 2. Supabase Auth ayarı (manuel ve zorunlu)

1. Supabase Dashboard → proje `xintudrmubjtvdbzvlao` → **Authentication → Providers → Google**.
2. Google sağlayıcısını etkinleştirip yukarıdaki Client ID ve Client Secret'ı girin.
3. **Authentication → URL Configuration**:
   - Site URL: `https://sah-world-309d2sjlf-eyuperenn1.vercel.app`
   - Redirect allow list:
     - `http://localhost:3000/auth/callback`
     - `https://sah-world-309d2sjlf-eyuperenn1.vercel.app/auth/callback`
     - Preview testi gerekiyorsa Supabase'in wildcard sözdizimiyle yalnızca bu Vercel projesinin preview domainleri
4. E-posta OTP akışının mevcut template ve rate-limit ayarlarını değiştirmeyin.

## 3. Vercel ortam değişkenleri

Vercel → Project Settings → Environment Variables içinde Production, Preview ve Development için:

```text
NEXT_PUBLIC_SUPABASE_URL=https://xintudrmubjtvdbzvlao.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
NEXT_PUBLIC_SITE_URL=https://sah-world-309d2sjlf-eyuperenn1.vercel.app
```

Mevcut proje legacy anon key kullanıyorsa kod `NEXT_PUBLIC_SUPABASE_ANON_KEY` adını da destekler. `SUPABASE_SERVICE_ROLE_KEY` ve Google Client Secret tarayıcıya açık değişkenlerde bulunmamalıdır.

## 4. İlk yöneticiyi yetkilendirme (manuel, bir kez)

Bu işlem kullanıcı e-postasını kod içine yazmadan Supabase SQL Editor'da yetkili proje sahibi tarafından yapılır. `<ADMIN_EMAIL>` yerine gerçek hesabın doğrulanmış e-postasını yazın:

```sql
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin')
WHERE email = '<ADMIN_EMAIL>';
```

Ardından ilgili hesap çıkış yapıp yeniden giriş yapmalıdır; yeni JWT `app_metadata.role` iddiasını böyle alır. Kontrol:

```sql
SELECT id, email, raw_app_meta_data ->> 'role' AS role
FROM auth.users
WHERE email = '<ADMIN_EMAIL>';
```

Yetkiyi kaldırmak için:

```sql
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) - 'role'
WHERE email = '<ADMIN_EMAIL>';
```

## 5. Geri bildirim güvenlik modeli

- Kullanıcı yalnızca kendi kayıtlarını okuyabilir.
- Kullanıcı tabloya doğrudan yazamaz, başka kullanıcı adına gönderemez, durum/yanıt güncelleyemez ve kayıt silemez.
- Yönetici tüm kayıtları yalnızca `app_metadata.role=admin` iken okuyabilir/güncelleyebilir.
- Listeleme, istatistik, durum/yanıt ve arşiv işlemleri sabit `search_path` kullanan kontrollü RPC'lerdir.
- Kaydedilen `page_path` sorgu parametresi/hash içeremez; form `/feedback` yolunu gönderir.
- Yönetim sayfası `/admin/feedback`; kullanıcı sayfası `/feedback`.

## 6. Yayın sonrası kontrol listesi

1. Normal e-posta OTP ile giriş yapın; mevcut kayıtların geldiğini doğrulayın.
2. Google test kullanıcısıyla giriş yapın; callback sonrası `/` açıldığını, ad/avatarın ilk profilde oluştuğunu doğrulayın.
3. Aynı doğrulanmış e-postayla OTP ve Google kullanıldığında aynı `profiles.id` ve mevcut verilerin korunduğunu doğrulayın.
4. İki normal hesapla geri bildirim gönderin; her hesabın yalnızca kendi geçmişini gördüğünü doğrulayın.
5. Normal hesapla `/admin/feedback` açın; veri yerine erişim reddi görünmelidir.
6. Yönetici hesabıyla filtre, sayfalama, durum, yanıt ve arşiv işlemlerini test edin.
7. 10 saniye içinde ikinci gönderimin ve 10 dakikada altıncı gönderimin hız sınırına takıldığını doğrulayın.
8. 375 px, 768 px ve masaüstü genişliklerinde giriş, kullanıcı formu ve yönetim listesini kontrol edin.

Google Client ID/Secret ve ilk yönetici hesabı dış panel sahibi tarafından girilmeden canlı Google yönlendirmesi/yönetici oturumu uçtan uca doğrulanmış sayılmaz.
