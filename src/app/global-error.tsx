"use client";

import styles from "./global-error.module.css";

// Independent of the root layout, fonts, icons, auth and database providers.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="tr">
      <head><title>Yeniden deneyelim | SAH World</title></head>
      <body className={styles.page}>
        <main className={styles.card} role="alert">
          <span className={styles.mark} aria-hidden="true">S</span>
          <h1>Uygulama yüklenemedi.</h1>
          <p>Geçici bir sorun oluştu. Yeniden deneyebilir veya ana sayfayı açabilirsin. Bu işlemler kayıt silmez.</p>
          <button onClick={() => retry()}>Yeniden dene</button>
          {/* Full document navigation must also recover a broken root/router. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">Ana sayfayı aç</a>
        </main>
      </body>
    </html>
  );
}
