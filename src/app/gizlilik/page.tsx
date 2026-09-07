import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <Link className="legal-back" href="/">
          ← SAH’a dön
        </Link>
        <p className="eyebrow">Şeffaflık</p>
        <h1>Gizlilik Politikası</h1>
        <p>
          SAH, hesabını ve kişisel gelişim kayıtlarını yalnızca hizmeti sunmak
          için işler. Oturum doğrulama Supabase Auth üzerinden yürütülür; Google
          ile girişte uygulama Google şifreni görmez veya saklamaz.
        </p>
        <h2>Toplanan veriler</h2>
        <p>
          E-posta adresin, hesap kimliğin, tercih ettiğin görünen ad ve avatar;
          uygulama içinde oluşturduğun günlük ve manevi içerikler, görevler,
          odak oturumları, XH ve seri bilgileri; topluluk mesajların ile
          gönderdiğin görüş ve öneriler tutulabilir.
        </p>
        <h2>Kullanım ve erişim</h2>
        <p>
          Veriler hizmeti çalıştırmak, hesabını eşitlemek ve sana kendi gelişim
          özetini göstermek için kullanılır. Kişisel kayıtların satır düzeyi
          güvenlik kurallarıyla hesabına bağlanır; satılmaz ve reklam amacıyla
          üçüncü taraflarla paylaşılmaz. Altyapı sağlayıcımız Supabase veriyi
          güvenli biçimde saklar.
        </p>
        <h2>Kontrol sende</h2>
        <p>
          Profil menüsündeki “Hesap ve gizlilik” alanından hesabını
          silebilirsin. Onay verdiğinde profilin ve hesabına bağlı kayıtların
          kalıcı olarak kaldırılır. Yardıma ihtiyaç duyarsan Görüş ve Öneri
          alanından bize ulaşabilirsin.
        </p>
        <h2>Son güncelleme</h2>
        <p>
          7 Eylül 2026. Önemli bir değişiklik olursa uygulama içinde açıkça
          duyururuz.
        </p>
      </article>
    </main>
  );
}
