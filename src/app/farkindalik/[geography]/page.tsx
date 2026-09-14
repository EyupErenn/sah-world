import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AWARENESS_CONTENT_FALLBACK, AWARENESS_SHARE_COPY, GEOGRAPHY_META, type Geography } from "@/lib/awareness";
import styles from "./page.module.css";

const slugToGeography = (slug: string): Geography | null =>
  slug === "filistin" ? "filistin" : slug === "dogu-turkistan" ? "dogu_turkistan" : null;

export function generateStaticParams() {
  return [{ geography: "filistin" }, { geography: "dogu-turkistan" }];
}

export async function generateMetadata({ params }: { params: Promise<{ geography: string }> }): Promise<Metadata> {
  const { geography: slug } = await params;
  const geography = slugToGeography(slug);
  if (!geography) return {};
  const copy = AWARENESS_SHARE_COPY[geography];
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://sah-world.vercel.app"),
    title: copy.title,
    description: copy.text,
    alternates: { canonical: `/farkindalik/${slug}` },
    openGraph: { title: copy.title, description: copy.text, type: "article", locale: "tr_TR", url: `/farkindalik/${slug}` },
    twitter: { card: "summary_large_image", title: copy.title, description: copy.text },
  };
}

export default async function AwarenessSharePage({ params }: { params: Promise<{ geography: string }> }) {
  const { geography: slug } = await params;
  const geography = slugToGeography(slug);
  if (!geography) notFound();
  const copy = AWARENESS_SHARE_COPY[geography];
  const meta = GEOGRAPHY_META[geography];
  const sources = AWARENESS_CONTENT_FALLBACK
    .filter((item) => item.geography === geography)
    .filter((item, index, all) => all.findIndex((candidate) => candidate.sourceUrl === item.sourceUrl) === index);

  return <main className={styles.page}>
    <section className={styles.hero}>
      <nav><Link href="/">SAH WORLD</Link><span>KAYNAKLI FARKINDALIK</span></nav>
      <div className={styles.orbit} aria-hidden><i /><i /><i /></div>
      <div className={styles.copy}><span>{meta.name.toLocaleUpperCase("tr-TR")}</span><h1>{copy.title}</h1><p>{copy.text}</p><a href={copy.sourceUrl} target="_blank" rel="noopener noreferrer">Ana kaynağı incele ↗</a></div>
      <small>Grafik görüntü içermez · Her olgusal cümle doğrudan kaynağa bağlanır</small>
    </section>
    <section className={styles.sources}><header><span>KAYNAK ZİNCİRİ</span><h2>Kendin doğrula.</h2><p>Bu sayfa kanaat değil, izin verilen kaynaklara giden sakin bir başlangıç noktasıdır.</p></header><div>{sources.map((source) => <a key={source.sourceUrl} href={source.sourceUrl} target="_blank" rel="noopener noreferrer"><small>{source.sectionTitle}</small><strong>{source.sourceName}</strong><span>Kaynağı aç ↗</span></a>)}</div></section>
    <footer className={styles.footer}><div><strong>SAH World</strong><p>Hafıza · Hakikat · Sorumluluk</p></div><Link href="/">Uygulamaya dön</Link></footer>
  </main>;
}
