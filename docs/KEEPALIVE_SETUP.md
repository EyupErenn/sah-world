# Supabase Keepalive kurulumu

Bu otomasyon, Supabase projesine üç günde bir küçük ve salt-okunur bir API isteği gönderir. Amaç, geliştirme dönemlerinde proje yedi gün boyunca tamamen hareketsiz kaldığında ücretsiz katmanın otomatik olarak duraklatılmasını önlemektir.

## Nasıl çalışır?

- `.github/workflows/supabase-keepalive.yml`, her ayın `1, 4, 7, ...` günlerinde saat `06:17 UTC`'de çalışır. Bu düzen en uzun aralığı yedi günün güvenle altında tutar.
- Workflow, kilitli npm bağımlılıklarını kurar ve `node scripts/keepalive.mjs` komutunu çalıştırır.
- Script, `profiles` tablosuna `HEAD` tabanlı bir `SELECT count` isteği gönderir. Satır içeriği indirilmez; veri eklenmez, güncellenmez veya silinmez.
- Ağ, yetkilendirme veya yapılandırma hatası oluşursa script sıfırdan farklı kodla kapanır. GitHub Actions çalışması kırmızı **X** ile görünür ve log, anahtarı yazdırmadan anlaşılır hata nedenini gösterir.

## Gerekli GitHub Actions secret'ları

GitHub deposunda şu yolu açın:

1. **Settings → Secrets and variables → Actions**
2. **New repository secret** düğmesine basın.
3. Aşağıdaki iki secret'ı adları birebir aynı olacak şekilde ayrı ayrı ekleyin:

| GitHub secret adı | Supabase değeri |
| --- | --- |
| `SUPABASE_URL` | Supabase Dashboard → ilgili proje → **Connect** → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Settings → API Keys** → tercihen yeni `sb_secret_...` secret key; mevcut projelerde **Legacy API Keys → service_role** da kullanılabilir |

GitHub secret adı geriye uyum ve istenen kurulum sözleşmesi nedeniyle `SUPABASE_SERVICE_ROLE_KEY` olarak kalır; içine yeni nesil `sb_secret_...` anahtarı da konabilir. Supabase yeni kurulumlar için bu anahtarı eski JWT tabanlı `service_role` anahtarına tercih eder. Publishable/anon anahtarını seçmeyin. Secret değerlerini herhangi bir `.env`, workflow YAML'i, issue, ekran görüntüsü veya log içine yapıştırmayın.

## Neden service role?

Bu işlem son kullanıcı tarayıcısında değil, güvenilen GitHub Actions ortamında çalışan bir sunucu otomasyonudur. `profiles` tablosunun kullanıcıya özel RLS politikaları anonim bir istemcinin güvenilir bir keep-alive kontrolü yapmasını engelleyebilir. Service-role anahtarı bu sunucu bağlamında tutarlı bir salt-okunur sorgu sağlar.

Service-role anahtarı geniş yetkilidir. Bu nedenle:

- yalnızca GitHub'ın şifreli repository secret deposundan workflow adımına aktarılır;
- repoya, Next.js kaynaklarına veya istemci bundle'ına yazılmaz;
- script anahtarı ya da tam bağlantı bilgisini hiçbir zaman loglamaz;
- sorgu uygulama seviyesinde yalnızca `SELECT` olarak tanımlanmıştır.

## İlk manuel doğrulama

Secret'ları ekledikten sonra:

1. GitHub deposunda **Actions** sekmesini açın.
2. Sol taraftan **Supabase Keepalive** workflow'unu seçin.
3. **Run workflow** düğmesine basın, `main` dalını seçin ve çalıştırın.
4. **Read-only database ping** işi yeşil olduğunda adımları açın.
5. Son adımda anahtar veya URL olmadan şu biçimde bir başarı mesajı görünmelidir: `Read-only Supabase ping succeeded (HTTP 200, ... ms).`

Bir secret eksik veya hatalıysa çalışma kırmızı **X** ile sona erer ve güvenli bir yapılandırma ya da sorgu hatası gösterir. GitHub'ın yerleşik bildirimi bu otomasyon için yeterlidir: kişisel **Settings → Notifications → System → Actions** alanından **Email** ve isterseniz yalnızca başarısız çalışmalar seçeneğini etkinleştirin. Zamanlanmış workflow bildirimi, workflow'u oluşturan kullanıcıya gider. Şimdilik ek webhook gerekmez; ekip daha sonra Slack/Discord bildirimi ekleyebilir.

> GitHub, public repository'de 60 gün boyunca hiçbir repository etkinliği olmazsa zamanlanmış workflow'ları devre dışı bırakabilir. Actions sayfasını dönemsel olarak kontrol edin; devre dışı kalırsa workflow'u yeniden etkinleştirin. `workflow_dispatch` ile manuel çalıştırma her zaman ayrıca kullanılabilir.

## Yerel güvenli kontrol

Gerçek service-role anahtarını terminal geçmişine yazmayın. Değişkenleri oturumunuzun güvenli ortam yönetimiyle sağladıktan sonra çalıştırın:

```bash
node scripts/keepalive.mjs
```

Bu dosya `src/` altında değildir ve Next.js uygulamasından import edilmez; yalnızca GitHub Actions/Node.js ortamında çalışır.

## Resmî kaynaklar

- [Supabase API anahtarları ve sunucu secret'ları](https://supabase.com/docs/guides/getting-started/api-keys)
- [GitHub Actions zamanlanmış workflow davranışı](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [GitHub Actions çalışma bildirimleri](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs)
