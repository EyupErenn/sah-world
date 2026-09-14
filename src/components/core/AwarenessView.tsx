"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { useAuthStore } from "@/store/useAuthStore";
import { useJourneyStore } from "@/store/useJourneyStore";
import { supabase } from "@/lib/supabase";
import { recordXpEvent } from "@/lib/xp";
import {
  AWARENESS_CONTENT_FALLBACK,
  AWARENESS_MILESTONES,
  AWARENESS_OPENINGS,
  AWARENESS_QUIZ_FALLBACK,
  AWARENESS_SHARE_COPY,
  GEOGRAPHY_META,
  HUMANITARIAN_ORGANIZATIONS,
  quizReward,
  type AwarenessContent,
  type AwarenessQuizQuestion,
  type Geography,
  type QuizOption,
} from "@/lib/awareness";

type Panel = "story" | "actions" | "quiz";
type EngagementType = "section_read" | "action_opened" | "quiz_completed" | "narrative_completed" | "shared";
const READ_REWARD = 15;
const SHARE_REWARD = 5;

const isApprovedSource = (url: string | null | undefined) => Boolean(url && (
  url.startsWith("https://www.dijitalhafiza.com/") ||
  url.startsWith("https://doguturkistan.dijitalhafiza.com/") ||
  url.startsWith("https://www.trthaber.com/")
));

const shareSlug = (geography: Geography) => geography === "filistin" ? "filistin" : "dogu-turkistan";

export default function AwarenessView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const user = useAuthStore((state) => state.session?.access_token === "mock-token" ? null : state.session?.user ?? null);
  const addXP = useJourneyStore((state) => state.addXP);
  const [geography, setGeography] = useState<Geography>("filistin");
  const [panel, setPanel] = useState<Panel>("story");
  const [content, setContent] = useState(AWARENESS_CONTENT_FALLBACK);
  const [questions, setQuestions] = useState(AWARENESS_QUIZ_FALLBACK);
  const [completedQuizzes, setCompletedQuizzes] = useState<Set<Geography>>(new Set());
  const [eventKeys, setEventKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const [contentResult, questionResult, attemptResult, engagementResult] = await Promise.all([
        supabase.from("regional_awareness_content").select("*").eq("is_published", true).order("order_index"),
        supabase.from("awareness_quiz_questions").select("*").order("order_index"),
        supabase.from("user_quiz_attempts").select("geography"),
        supabase.from("awareness_engagement_log").select("geography, content_id, event_type"),
      ]);
      if (!active) return;

      // A stale or partially migrated table cannot silently reintroduce an
      // unreviewed source. Only the complete locally audited chain may replace it.
      const reviewedUrls = new Set(AWARENESS_CONTENT_FALLBACK.map((item) => item.sourceUrl));
      const reviewedContent = (contentResult.data ?? []).filter((item) =>
        Boolean(item.section_title && item.content_body && item.source_name) &&
        Number.isFinite(item.display_order) &&
        isApprovedSource(item.source_url) &&
        reviewedUrls.has(item.source_url),
      );
      const hasCompleteJourney = reviewedContent.length === AWARENESS_CONTENT_FALLBACK.length &&
        (["filistin", "dogu_turkistan"] as Geography[]).every((key) =>
          reviewedContent.filter((item) => item.geography === key).length === 6,
        );
      if (hasCompleteJourney) {
        setContent(reviewedContent.map((item) => ({
          id: item.id,
          geography: item.geography,
          section: item.section,
          sectionTitle: item.section_title,
          contentBody: item.content_body,
          sourceName: item.source_name,
          sourceUrl: item.source_url,
          displayOrder: item.display_order,
          actionCue: item.action_cue,
        })));
      }

      const reviewedQuestionUrls = new Set(AWARENESS_QUIZ_FALLBACK.map((item) => item.sourceUrl));
      const reviewedQuestions = (questionResult.data ?? []).filter((item) =>
        isApprovedSource(item.source_url) && reviewedQuestionUrls.has(item.source_url),
      );
      if (reviewedQuestions.length === AWARENESS_QUIZ_FALLBACK.length) {
        setQuestions(reviewedQuestions.map((item) => ({
          id: item.id,
          geography: item.geography,
          questionText: item.question_text,
          options: { A: item.option_a, B: item.option_b, C: item.option_c, D: item.option_d },
          correctOption: item.correct_option,
          explanationText: item.explanation_text,
          orderIndex: item.order_index,
          sourceUrl: item.source_url,
        })));
      }
      setCompletedQuizzes(new Set((attemptResult.data ?? []).map((item) => item.geography)));
      setEventKeys(new Set((engagementResult.data ?? []).map((item) =>
        `${item.event_type}:${item.geography}:${item.content_id}`,
      )));
    };
    void load();
    return () => { active = false; };
  }, [user]);

  const logEngagement = useCallback(async (
    eventType: EngagementType,
    targetGeography: Geography,
    contentId: string,
    metadata: Record<string, string | number | boolean> = {},
  ) => {
    const key = `${eventType}:${targetGeography}:${contentId}`;
    const isNew = !eventKeys.has(key);
    setEventKeys((current) => new Set(current).add(key));
    if (user) {
      const { error } = await supabase.from("awareness_engagement_log").upsert({
        user_id: user.id,
        geography: targetGeography,
        content_id: contentId,
        event_type: eventType,
        metadata,
      }, { onConflict: "user_id,geography,content_id,event_type" });
      if (error) console.warn("Farkındalık etkileşimi kaydedilemedi:", error.message);
    }
    return isNew;
  }, [eventKeys, user]);

  const awardOnce = useCallback(async (
    eventType: "narrative_completed" | "shared",
    targetGeography: Geography,
    amount: number,
    label: string,
    metadata: Record<string, string | number | boolean> = {},
  ) => {
    const contentId = `${eventType}:${targetGeography}`;
    const isNew = await logEngagement(eventType, targetGeography, contentId, metadata);
    if (!isNew) return;
    addXP(amount);
    await recordXpEvent({
      sourceType: eventType === "shared" ? "awareness_share" : "awareness_read",
      sourceId: contentId,
      label,
      amount,
    });
  }, [addXP, logEngagement]);

  const geographyItems = useMemo(() => content
    .filter((item) => item.geography === geography)
    .sort((a, b) => a.displayOrder - b.displayOrder), [content, geography]);
  const readCount = geographyItems.filter((item) =>
    eventKeys.has(`section_read:${geography}:${item.id}`),
  ).length;

  useEffect(() => {
    if (geographyItems.length && readCount === geographyItems.length) {
      const timer = window.setTimeout(() => {
        void awardOnce("narrative_completed", geography, READ_REWARD,
          `${GEOGRAPHY_META[geography].name} anlatısı tamamlandı`,
          { sections: geographyItems.length });
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [awardOnce, geography, geographyItems.length, readCount]);

  const changeGeography = (next: Geography) => {
    setGeography(next);
    setPanel("story");
    window.setTimeout(() => document.getElementById("awareness-opening")?.scrollIntoView({ behavior: "smooth" }), 20);
  };
  const openPrayer = () => {
    sessionStorage.setItem("sah:mescidim:tab", "dua");
    sessionStorage.setItem("sah:mescidim:occasion", "Sıkıntı");
    onNavigate("mescidim");
  };

  const meta = GEOGRAPHY_META[geography];
  return (
    <div className={`awareness-experience awareness-${geography}`} style={{ "--awareness-accent": meta.accent } as React.CSSProperties}>
      <header className="awareness-route-bar">
        <div><span className="awareness-kicker"><AppIcon name="world-heart" /> HAFIZA · HAKİKAT · SORUMLULUK</span><h1>Mazlum Coğrafyalar</h1></div>
        <div className="awareness-route-progress" aria-label="Okuma ilerlemesi"><span><i style={{ width: `${(readCount / Math.max(geographyItems.length, 1)) * 100}%` }} /></span><small>{readCount}/{geographyItems.length} bölüm</small></div>
      </header>

      <nav className="awareness-geography-tabs" aria-label="Coğrafya seçimi">
        {(Object.keys(GEOGRAPHY_META) as Geography[]).map((key) => (
          <button key={key} className={key === geography ? "active" : ""} onClick={() => changeGeography(key)}>
            <AppIcon name={GEOGRAPHY_META[key].icon} />
            <span><strong>{GEOGRAPHY_META[key].name}</strong><small>{GEOGRAPHY_META[key].short}</small></span>
          </button>
        ))}
      </nav>

      <nav className="awareness-mode-tabs" aria-label="İçerik görünümü">
        <button className={panel === "story" ? "active" : ""} onClick={() => setPanel("story")}><AppIcon name="route" /> Anlatı</button>
        <button className={panel === "actions" ? "active" : ""} onClick={() => setPanel("actions")}><AppIcon name="heart-handshake" /> Ne yapabiliriz?</button>
        <button className={panel === "quiz" ? "active" : ""} onClick={() => setPanel("quiz")}><AppIcon name="bulb" /> Bilgi testi</button>
      </nav>

      {panel === "story" && <ScrollyNarrative key={geography} geography={geography} items={geographyItems} eventKeys={eventKeys}
        onRead={(item) => void logEngagement("section_read", geography, item.id, { source_url: item.sourceUrl })}
        onResolve={() => setPanel("actions")} />}
      {panel === "actions" && <ActionPanel geography={geography} onQuiz={() => setPanel("quiz")} onPrayer={openPrayer}
        onAction={(href) => void logEngagement("action_opened", geography, href, { target_url: href })}
        onShared={(channel) => void awardOnce("shared", geography, SHARE_REWARD, `${meta.name} kaynaklı farkındalık paylaşımı`, { channel })} />}
      {panel === "quiz" && <Quiz geography={geography}
        questions={questions.filter((item) => item.geography === geography).sort((a, b) => a.orderIndex - b.orderIndex)}
        rewarded={completedQuizzes.has(geography)}
        onRewarded={() => setCompletedQuizzes((items) => new Set(items).add(geography))}
        onCompleted={(score) => void logEngagement("quiz_completed", geography, `quiz:${geography}`, { score })} />}

      <footer className="awareness-integrity-note"><AppIcon name="shield-check" /><div><strong>Kaynak zinciri görünür.</strong><p>Her olgusal cümlenin kaynağı aynı ekranda yer alır. Tanık ve kurum açıklamaları sahibine atfedilir; grafik görüntü kullanılmaz.</p></div></footer>
    </div>
  );
}

function ScrollyNarrative({ geography, items, eventKeys, onRead, onResolve }: {
  geography: Geography;
  items: AwarenessContent[];
  eventKeys: Set<string>;
  onRead: (item: AwarenessContent) => void;
  onResolve: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showSourceDock, setShowSourceDock] = useState(false);
  const opening = AWARENESS_OPENINGS[geography];
  const meta = GEOGRAPHY_META[geography];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-story-index]"));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.42) continue;
        const panel = entry.target as HTMLElement;
        const index = Number(panel.dataset.storyIndex ?? 0);
        setActiveIndex(index);
        const item = items[index];
        if (item) onRead(item);
      }
    }, { threshold: [0.42, 0.62], rootMargin: "-8% 0px -8% 0px" });
    panels.forEach((panel) => observer.observe(panel));
    return () => observer.disconnect();
  }, [items, onRead]);

  useEffect(() => {
    const updateDock = () => {
      const grid = rootRef.current?.querySelector<HTMLElement>(".awareness-story-grid");
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      setShowSourceDock(rect.top < window.innerHeight * 0.55 && rect.bottom > window.innerHeight * 0.25);
    };
    updateDock();
    window.addEventListener("scroll", updateDock, { passive: true });
    return () => window.removeEventListener("scroll", updateDock);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let disposed = false;
    let revert: (() => void) | undefined;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([gsapModule, triggerModule]) => {
      if (disposed) return;
      const gsap = gsapModule.gsap;
      const ScrollTrigger = triggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      const context = gsap.context(() => {
        root.querySelectorAll<HTMLElement>(".awareness-story-copy").forEach((copy) => {
          gsap.fromTo(copy, { opacity: 0.18, y: 42 }, { opacity: 1, y: 0, ease: "none", scrollTrigger: {
            trigger: copy, start: "top 84%", end: "center 54%", scrub: 0.7,
          } });
        });
        gsap.to(root.querySelector(".awareness-orbit-line"), { rotate: 22, transformOrigin: "50% 50%", ease: "none", scrollTrigger: {
          trigger: root, start: "top top", end: "bottom bottom", scrub: 1.2,
        } });
      }, root);
      revert = () => context.revert();
    });
    return () => { disposed = true; revert?.(); };
  }, [geography]);

  if (!items.length) return <div className="awareness-source-empty"><AppIcon name="cloud-off" /><h2>Kaynak incelemesi sürüyor</h2><p>Doğrulanmamış metin yayımlamak yerine bu anlatı kaynak onayını bekliyor.</p></div>;
  const active = items[Math.min(activeIndex, items.length - 1)];

  return (
    <div className="awareness-story" ref={rootRef}>
      <section id="awareness-opening" className="awareness-opening">
        <div className="awareness-opening-mark" aria-hidden><span /><span /><span /></div>
        <div className="awareness-opening-copy"><span>{meta.name.toLocaleUpperCase("tr-TR")} · DOĞRULANMIŞ BAŞLANGIÇ</span><h2>{opening.statement}</h2><a href={opening.sourceUrl} target="_blank" rel="noopener noreferrer"><AppIcon name="external-link" /> {opening.sourceName}</a></div>
        <button onClick={() => document.getElementById(`awareness-story-${items[0].id}`)?.scrollIntoView({ behavior: "smooth" })} className="awareness-scroll-cue"><span>Hikâyeyi kaynağıyla izle</span><AppIcon name="arrow-down" /></button>
      </section>

      <div className="awareness-story-grid">
        <aside className="awareness-visual-rail" aria-hidden><div className="awareness-visual-frame">
          <svg viewBox="0 0 420 520" role="img"><defs><linearGradient id={`awareness-gradient-${geography}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f6d7c8" stopOpacity=".25"/><stop offset="1" stopColor={meta.accent} stopOpacity=".95"/></linearGradient></defs><path className="awareness-orbit-line" d="M74 104C154 28 326 65 350 177c27 126-70 235-184 278-66 25-124-8-117-66 9-77 125-79 199-143 61-53 35-139-40-150-66-10-119 37-134 102" fill="none" stroke={`url(#awareness-gradient-${geography})`} strokeWidth="2" strokeLinecap="round" strokeDasharray="2 9"/><path d="M208 66v389" stroke="rgba(255,255,255,.14)" strokeWidth="1"/>{items.map((item, index) => { const y = 82 + index * 72; const selected = index === activeIndex; return <g key={item.id} transform={`translate(208 ${y})`}><circle r={selected ? 13 : 7} fill={selected ? meta.accent : "#6f7481"}/><circle r={selected ? 24 : 14} fill="none" stroke={selected ? meta.accent : "rgba(255,255,255,.18)"} opacity=".6"/><text x="-34" y="5" fill="#fff" fontSize="11" fontWeight="700" textAnchor="end">{String(index + 1).padStart(2, "0")}</text></g>; })}</svg>
          <div><small>HAFIZA ÇİZGİSİ</small><strong>{AWARENESS_MILESTONES[geography][Math.min(activeIndex, AWARENESS_MILESTONES[geography].length - 1)]}</strong></div>
        </div></aside>

        <main className="awareness-story-panels">
          {items.map((item, index) => <article id={`awareness-story-${item.id}`} key={item.id} data-story-index={index} className={`awareness-story-panel ${index === activeIndex ? "is-active" : ""}`}><div className="awareness-story-copy">
            <header><span>{String(index + 1).padStart(2, "0")}</span><small>{sectionLabel(item.section)}</small>{eventKeys.has(`section_read:${geography}:${item.id}`) && <i title="Okundu"><AppIcon name="circle-check-filled" /></i>}</header>
            <h2>{item.sectionTitle}</h2><p>{item.contentBody}</p>
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={() => onRead(item)}><span>KAYNAK</span><strong>{item.sourceName}</strong><AppIcon name="external-link" /></a>
            <blockquote><AppIcon name="heart-handshake" /><span><small>SORUMLULUĞA DÖNÜŞTÜR</small>{item.actionCue}</span></blockquote>
          </div></article>)}
          <section className="awareness-resolution-bridge"><span>HAFIZA, EYLEMLE TAMAMLANIR.</span><h2>Şimdi ne yapabileceğini seç.</h2><p>Bilgiyi doğrula, güvenilir yardımı destekle, dua et veya kaynağıyla çevrene duyur.</p><button className="primary-button" onClick={onResolve}>Ne yapabiliriz? <AppIcon name="arrow-right" /></button></section>
        </main>
      </div>

      {showSourceDock && <div className="awareness-source-dock" aria-live="polite"><span><i style={{ width: `${((activeIndex + 1) / items.length) * 100}%` }} /></span><div><small>ŞU ANKİ KAYNAK</small><a href={active.sourceUrl} target="_blank" rel="noopener noreferrer">{active.sourceName} <AppIcon name="external-link" /></a></div><b>{activeIndex + 1}/{items.length}</b></div>}
    </div>
  );
}

function sectionLabel(section: AwarenessContent["section"]) {
  return ({ history: "TARİHSEL ARKA PLAN", displacement: "YERİNDEN EDİLME", today: "BUGÜNÜN GERÇEĞİ", human: "İNSAN BOYUTU", detention: "GÖZALTI VE MAHPUSLAR", culture: "KİMLİK VE KÜLTÜR", solidarity: "SEBAT VE DAYANIŞMA" } as const)[section];
}

function ActionPanel({ geography, onQuiz, onPrayer, onAction, onShared }: {
  geography: Geography;
  onQuiz: () => void;
  onPrayer: () => void;
  onAction: (href: string) => void;
  onShared: (channel: string) => void;
}) {
  const [notice, setNotice] = useState("");
  const meta = GEOGRAPHY_META[geography];
  const shareCopy = AWARENESS_SHARE_COPY[geography];
  const share = async (channel: "whatsapp" | "x" | "native" | "copy") => {
    const url = `${window.location.origin}/farkindalik/${shareSlug(geography)}`;
    const text = `${shareCopy.text}\n\nKaynak: ${shareCopy.sourceUrl}`;
    try {
      if (channel === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank", "noopener,noreferrer");
      else if (channel === "x") window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareCopy.text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
      else if (channel === "native" && navigator.share) await navigator.share({ title: shareCopy.title, text, url });
      else { await navigator.clipboard.writeText(`${text}\n${url}`); setNotice("Kaynaklı paylaşım metni ve bağlantı kopyalandı."); }
      onShared(channel);
    } catch { setNotice("Paylaşım iptal edildi; hiçbir veri gönderilmedi."); }
  };

  return <section className="awareness-actions-v2">
    <header><span>NE YAPABİLİRİZ?</span><h2>Duyguyu, güvenilir ve somut bir adıma dönüştür.</h2><p>Her yol birbirinden bağımsızdır. Sana uygun olan tek bir adımı seçmen yeterli.</p></header>
    <div className="awareness-action-grid-v2">
      <article><span><AppIcon name="bulb" /></span><small>01 · ÖĞREN VE ÖĞRET</small><h3>Bilgiyi doğru yaymanın ilk adımı</h3><p>Kaynaklara dayanan 10 soruluk kısa testle kavramları ve tarihleri pekiştir.</p><button onClick={onQuiz}>Bilgi testini aç <AppIcon name="arrow-right" /></button></article>
      <article><span><AppIcon name="heart-handshake" /></span><small>02 · GÜVENİLİR DESTEĞİ SEÇ</small><h3>Resmî yardım kanallarını incele</h3><p>Bağış yapmadan önce kampanya kapsamını, güncelliğini ve ödeme alan adını kendin kontrol et.</p><div className="awareness-orgs">{HUMANITARIAN_ORGANIZATIONS.map((org) => <a key={org.href} href={org.href} target="_blank" rel="noopener noreferrer" onClick={() => onAction(org.href)}><strong>{org.name}</strong><small>{org.note}</small><AppIcon name="external-link" /></a>)}</div></article>
      <article><span><AppIcon name="building-mosque" /></span><small>03 · DUA ET</small><h3>Zulüm ve sıkıntı karşısında dur</h3><p>Mescidim’deki kaynaklı dua kütüphanesini doğrudan “Sıkıntı” seçimiyle aç.</p><button onClick={onPrayer}>Dua kütüphanesine geç <AppIcon name="arrow-right" /></button></article>
      <article className="awareness-share-card"><span><AppIcon name="share-3" /></span><small>04 · ÇEVRENE DUYUR</small><h3>Kaynağı görünür tutarak paylaş</h3><div className="awareness-share-preview"><i>{meta.name.toLocaleUpperCase("tr-TR")}</i><strong>{shareCopy.title}</strong><p>{shareCopy.text}</p><small>SAH WORLD · KAYNAKLI FARKINDALIK</small></div><div className="awareness-share-buttons"><button onClick={() => void share("whatsapp")}><AppIcon name="brand-whatsapp" /> WhatsApp</button><button onClick={() => void share("x")}><AppIcon name="brand-x" /> X</button><button onClick={() => void share("native")}><AppIcon name="brand-instagram" /> Instagram / Paylaş</button><button onClick={() => void share("copy")}><AppIcon name="copy" /> Metni kopyala</button></div>{notice && <p className="awareness-share-notice">{notice}</p>}</article>
    </div>
    <p className="awareness-reward-note"><AppIcon name="sparkles" /> Tam anlatı için {READ_REWARD} XH, ilk kaynaklı paylaşım için {SHARE_REWARD} XH. Ödül yalnızca ilk tamamlamada verilir.</p>
  </section>;
}

function Quiz({ geography, questions, rewarded, onRewarded, onCompleted }: {
  geography: Geography;
  questions: AwarenessQuizQuestion[];
  rewarded: boolean;
  onRewarded: () => void;
  onCompleted: (score: number) => void;
}) {
  const addXP = useJourneyStore((state) => state.addXP);
  const user = useAuthStore((state) => state.session?.access_token === "mock-token" ? null : state.session?.user ?? null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<QuizOption | null>(null);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState("");
  const [wasRewarded] = useState(rewarded);
  const [awardedThisRun, setAwardedThisRun] = useState(false);
  const question = questions[index];
  const meta = GEOGRAPHY_META[geography];
  const reward = quizReward(score);
  const options = useMemo(() => ["A", "B", "C", "D"] as QuizOption[], []);

  if (!question) return <div className="empty-state"><i><AppIcon name="cloud-off" /></i><strong>Sorular kaynak onayını bekliyor</strong><p>Doğrulanmamış soru göstermek yerine test geçici olarak kapalı tutuluyor.</p></div>;
  const answer = (option: QuizOption) => { if (selected) return; setSelected(option); if (option === question.correctOption) setScore((value) => value + 1); };
  const next = async () => {
    if (index < questions.length - 1) { setIndex((value) => value + 1); setSelected(null); return; }
    const finalScore = score;
    setDone(true);
    onCompleted(finalScore);
    const earned = quizReward(finalScore);
    if (!wasRewarded) {
      addXP(earned); setAwardedThisRun(true); onRewarded();
      const attemptId = crypto.randomUUID();
      await Promise.all([
        user ? supabase.from("user_quiz_attempts").insert({ id: attemptId, user_id: user.id, geography, score: finalScore, xh_awarded: earned }) : Promise.resolve(),
        recordXpEvent({ sourceType: "awareness_quiz", sourceId: attemptId, label: `${meta.name} bilgi testi`, amount: earned }),
      ]);
    } else if (user) await supabase.from("user_quiz_attempts").insert({ user_id: user.id, geography, score: finalScore, xh_awarded: 0 });
  };
  const retry = () => { setIndex(0); setScore(0); setSelected(null); setDone(false); setNotice(""); setAwardedThisRun(false); };
  const share = async () => {
    const text = `SAH World ${meta.name} bilgi testinde ${score}/10 doğru yaptım. Kaynaklı öğrenme yolculuğuna sen de katıl.`;
    const url = `${window.location.origin}/farkindalik/${shareSlug(geography)}`;
    try { if (navigator.share) await navigator.share({ title: "SAH World · Mazlum Coğrafyalar", text, url }); else { await navigator.clipboard.writeText(`${text} ${url}`); setNotice("Sonuç bağlantısı panoya kopyalandı."); } } catch { /* Kullanıcının paylaşım penceresini kapatması hata değildir. */ }
  };

  if (done) return <div className="quiz-result"><span className="result-orbit"><AppIcon name={score >= 8 ? "rosette-discount-check" : "sparkles"} /></span><p className="eyebrow">{meta.name.toLocaleUpperCase("tr-TR")} · TEST TAMAMLANDI</p><h3>{score}/10 doğru</h3><p>{score >= 8 ? "Kaynakları dikkatle takip ettin. Şimdi bu bilgiyi sakin, özenli ve doğrulanabilir biçimde paylaşabilirsin." : "Açıklamaları ve kaynakları yeniden inceleyerek bilgi zincirini güçlendirebilirsin."}</p><div className="quiz-reward"><span><AppIcon name="sparkles" /></span><div><strong>{awardedThisRun ? `+${reward} XH kazandın` : "Bu tur öğrenme amaçlıydı"}</strong><small>{awardedThisRun ? `40 tamamlama XH’si + ${score * 5} doğru cevap XH’si` : "XH ödülü her coğrafyada yalnızca ilk tamamlamada verilir."}</small></div></div><div className="result-actions"><button className="primary-button" onClick={() => void share()}><AppIcon name="share-3" /> Sonucu paylaş</button><button className="ghost-button" onClick={retry}><AppIcon name="refresh" /> Yeniden dene</button></div>{notice && <p className="inline-notice">{notice}</p>}</div>;
  const answeredCorrectly = selected === question.correctOption;
  return <div className="quiz-layout awareness-quiz-v2"><aside><span className="quiz-index">{String(index + 1).padStart(2, "0")}<small>/10</small></span><div className="quiz-progress"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div><p><strong>{score}</strong> doğru cevap</p><small>Her sorudan sonra açıklamayı ve kaynağı incele.</small></aside><section className="quiz-card"><header><span>{meta.name} bilgi testi</span><span>{index + 1} / {questions.length}</span></header><h3>{question.questionText}</h3><div className="quiz-options">{options.map((option) => { const isCorrect = selected && option === question.correctOption; const isWrong = selected === option && option !== question.correctOption; return <button key={option} className={`${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`} onClick={() => answer(option)} disabled={Boolean(selected)}><b>{option}</b><span>{question.options[option]}</span>{isCorrect && <AppIcon name="circle-check-filled" />}{isWrong && <AppIcon name="circle-x-filled" />}</button>; })}</div>{selected && <motion.div className={`answer-explanation ${answeredCorrectly ? "correct" : "learn"}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}><span><AppIcon name={answeredCorrectly ? "circle-check" : "bulb"} /></span><div><strong>{answeredCorrectly ? "Doğru cevap" : `Doğru cevap: ${question.correctOption}`}</strong><p>{question.explanationText}</p><a href={question.sourceUrl} target="_blank" rel="noopener noreferrer">Kaynağı incele <AppIcon name="external-link" /></a></div></motion.div>}<footer><span>{wasRewarded ? "Tekrar turu · XH ödülü verilmez" : "İlk tamamlama ödülü: 40 + doğru başına 5 XH"}</span><button className="primary-button" disabled={!selected} onClick={() => void next()}>{index === questions.length - 1 ? "Sonucu gör" : "Sonraki soru"} <AppIcon name="arrow-right" /></button></footer></section></div>;
}
