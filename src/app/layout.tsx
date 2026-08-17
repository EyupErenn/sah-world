import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import { AuthProvider } from '@/providers/AuthProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SAH World | 3D Hayat Yolculuğu & Ahiret Deposu',
  description: 'Kendi hayat yolculuğuna çık. 3D evrende ilerle, amellerini kaydet ve Ahiret Deponu inşa et.',
  keywords: ['günlük', 'kuran', 'hadis', 'eisenhower', 'şükür', 'mescid', 'zikirmatik', 'kişisel gelişim'],
  authors: [{ name: 'SAH World' }],
  openGraph: {
    title: 'SAH World | 3D Hayat Yolculuğu',
    description: 'Kişisel gelişim, manevi rehberlik ve hayat yönetimi platformu.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        {/* Tabler Icons */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body className="antialiased bg-[#fafbfc] text-slate-900 overflow-x-hidden">
        <AuthProvider>
          {children}
        </AuthProvider>
        {/* Canvas Confetti */}
        <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
