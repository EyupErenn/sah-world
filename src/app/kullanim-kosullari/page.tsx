import Link from 'next/link'

export default function TermsPage() {
  return <main className="legal-page"><article className="legal-card"><Link className="legal-back" href="/">← SAH’a dön</Link><p className="eyebrow">SAH platformu</p><h1>Kullanım Koşulları</h1><p>SAH kişisel gelişim ve öz değerlendirme amacıyla sunulur. Tıbbi, hukuki veya profesyonel danışmanlığın yerine geçmez.</p><h2>Hesap güvenliği</h2><p>Hesabına gönderilen tek kullanımlık kodları paylaşmamak ve kullandığın Google hesabının güvenliğini korumak senin sorumluluğundadır.</p><h2>Topluluk ilkeleri</h2><p>Topluluk ve mesajlaşma alanlarında saygılı, yasal ve başkalarının haklarını gözeten içerikler paylaşılmalıdır. Kötüye kullanım hâlinde erişim sınırlandırılabilir.</p><h2>Hizmet değişiklikleri</h2><p>Özellikler güvenlik, performans ve ürün kalitesi amacıyla güncellenebilir. Önemli koşul değişiklikleri uygulama içinde duyurulur.</p></article></main>
}
