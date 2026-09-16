"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { openAppView, readAppView } from "@/lib/appLocation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { User } from "@supabase/supabase-js";
import LoginScreen from "@/components/auth/LoginScreen";
import { AppIcon } from "@/components/ui/AppIcon";
import AvatarImage from "@/components/ui/AvatarImage";
import { useAuthStore } from "@/store/useAuthStore";
import { useJourneyStore } from "@/store/useJourneyStore";
import { useFocusTimerStore } from "@/store/useFocusTimerStore";
import { getLevelForXP } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import type { SectionKey } from "./SectionView";
import WelcomeGuide from "./WelcomeGuide";
import CommandPalette from "./CommandPalette";
import MilestoneCelebration, { type Milestone } from "./MilestoneCelebration";
import AwarenessProfileSummary from "./AwarenessProfileSummary";
import ProfessionProfileSummary from "./ProfessionProfileSummary";
import CommunityErrorBoundary from "./CommunityErrorBoundary";
import type { GrowthNavigationCue } from "./GrowthTree";

const DashboardView = dynamic(() => import("./DashboardView"), {
  loading: () => <DashboardLoading />,
});
const ReportsView = dynamic(() => import("./ReportsView"), {
  loading: () => <ViewSkeleton />,
});
const CommunityView = dynamic(() => import("./CommunityView"), {
  loading: () => <ViewSkeleton />,
});
const SectionView = dynamic(() => import("./SectionView"), {
  loading: () => <ViewSkeleton />,
});
const JournalHubView = dynamic(() => import("./JournalHubView"), {
  loading: () => <ViewSkeleton />,
});
const FocusTimerView = dynamic(() => import("./FocusTimerView"), {
  loading: () => <ViewSkeleton />,
});
const AwarenessView = dynamic(() => import("./AwarenessView"), {
  loading: () => <ViewSkeleton />,
});
const ProfessionSchoolView = dynamic(() => import("./ProfessionSchoolView"), {
  loading: () => <ViewSkeleton />,
});
const QuranCompanionView = dynamic(() => import("./QuranCompanionView"), {
  loading: () => <ViewSkeleton />,
});
const AccountSettingsDialog = dynamic(() => import("./AccountSettingsDialog"));

type ViewKey =
  | "dashboard"
  | "growth"
  | "community"
  | "reports"
  | "focus"
  | "awareness"
  | "profession-school"
  | "quran-companion"
  | SectionKey;
type NavigationItem = { id: ViewKey; label: string; icon: string };

const navigationItems: NavigationItem[] = [
  { id: "focus", label: "Odaklanma", icon: "target-arrow" },
  { id: "quran-companion", label: "Kur’an’ı Kerim Kardeşim", icon: "book-2" },
  { id: "mescidim", label: "Mescidim", icon: "building-mosque" },
  { id: "journal", label: "Günlük", icon: "notebook" },
  { id: "awareness", label: "Mazlum Coğrafyalar", icon: "world-heart" },
  { id: "reports", label: "Raporlarım", icon: "chart-histogram" },
  {
    id: "profession-school",
    label: "Meslek ve Ahlak Okulu",
    icon: "certificate",
  },
];

const viewLabels: Partial<Record<ViewKey, string>> = Object.fromEntries(
  navigationItems.map((item) => [item.id, item.label]),
);
viewLabels.dashboard = "Evrenim";
viewLabels.community = "Topluluk";
viewLabels.growth = "Gelişim detaylarım";

export default function SahApp({
  initialUser,
  initialProfile,
}: {
  initialUser: User | null;
  initialProfile: Profile | null;
}) {
  const { session, user, isAuthLoading, profile } = useAuthStore();
  const store = useJourneyStore();
  const searchParams = useSearchParams();
  const view = readAppView(searchParams);
  const setView = useCallback((next: string) => {
    openAppView(readAppView(new URLSearchParams({ view: next })));
  }, []);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [onboardingPreview, setOnboardingPreview] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [milestone, setMilestone] = useState<Milestone>(null);
  const [transitionCue, setTransitionCue] = useState<(GrowthNavigationCue & { nonce: number }) | null>(null);
  const reducedMotion = useReducedMotion();
  const transitionCueTimer = useRef<number | null>(null);
  const milestoneArmed = useRef(false);
  const milestoneSnapshot = useRef({
    journal: store.journal.length,
    streak: store.streak.current,
    level: getLevelForXP(store.xp).level.name,
  });
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { level } = getLevelForXP(store.xp);
  const journalCount = store.journal.length;
  const streakCurrent = store.streak.current;
  const currentLevelName = level.name;
  const savedThemePreference =
    profile?.theme_preference ?? initialProfile?.theme_preference;

  useEffect(() => {
    // DEV-ONLY: enables deterministic end-to-end onboarding QA without
    // creating or mutating a real Supabase account.
    if (process.env.NODE_ENV === "development") {
      queueMicrotask(() =>
        setOnboardingPreview(
          new URLSearchParams(window.location.search).get("onboarding") ===
            "preview",
        ),
      );
    }
  }, [setView]);

  useEffect(() => {
    const openFocus = () => {
      setView("focus");
      setMoreOpen(false);
      setProfileOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("sah:open-focus", openFocus);
    return () => window.removeEventListener("sah:open-focus", openFocus);
  }, [setView]);

  useEffect(() => {
    const showFocus = () => {
      setView("focus");
      setMoreOpen(false);
      setProfileOpen(false);
    };
    const initialSync = window.setTimeout(() => {
      // A restored fullscreen preference must not replace an explicit shared URL.
      if (useFocusTimerStore.getState().isFullscreen && !new URLSearchParams(window.location.search).has('view')) showFocus();
    }, 0);
    const unsubscribe = useFocusTimerStore.subscribe((state, previous) => {
      if (state.isFullscreen && !previous.isFullscreen) showFocus();
    });
    return () => {
      window.clearTimeout(initialSync);
      unsubscribe();
    };
  }, [setView]);

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      )
        setProfileOpen(false);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, []);

  useEffect(() => {
    const localPreference = window.localStorage.getItem("sah-theme-preference");
    const preference =
      savedThemePreference ??
      (localPreference === "light" ||
      localPreference === "dark" ||
      localPreference === "system"
        ? localPreference
        : "system");
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const nextTheme =
        preference === "system" ? (media.matches ? "dark" : "light") : preference;
      document.documentElement.dataset.theme = nextTheme;
      setTheme(nextTheme);
    };
    const timer = window.setTimeout(apply, 0);
    if (preference === "system") media.addEventListener("change", apply);
    return () => {
      window.clearTimeout(timer);
      media.removeEventListener("change", apply);
    };
  }, [savedThemePreference]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      milestoneArmed.current = true;
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []); // İlk veri eşitlemesini kutlama olarak göstermeyiz.

  useEffect(() => {
    const current = {
      journal: journalCount,
      streak: streakCurrent,
      level: currentLevelName,
    };
    const previous = milestoneSnapshot.current;
    if (milestoneArmed.current && !milestone) {
      let next: Exclude<Milestone, null> | null = null;
      if (previous.journal < 10 && current.journal >= 10)
        next = {
          id: "journal-10",
          eyebrow: "BİR DÖNÜM NOKTASI",
          title: "Kendine on kez alan açtın.",
          message:
            "On günlük kaydı; hızdan çok, tekrar tekrar kendine dönmeyi seçtiğini gösteriyor.",
          icon: "notebook",
        };
      else if (
        [7, 30, 100].includes(current.streak) &&
        previous.streak < current.streak
      )
        next = {
          id: `streak-${current.streak}`,
          eyebrow: "İSTİKRARIN GÖRÜNÜR OLDU",
          title: `${current.streak} günlük seri.`,
          message:
            "Küçük adımların birbirine eklenerek nasıl bir ritim kurduğunu fark et.",
          icon: "flame",
        };
      else if (previous.level !== current.level)
        next = {
          id: `level-${current.level}`,
          eyebrow: "YENİ BİR EVRE",
          title: `${current.level} seviyesine ulaştın.`,
          message:
            "Bu seviye yalnızca uygulamadaki istikrarının yeni bir görünümüdür. Yolculuğun sana ait.",
          icon: "sparkles",
        };
      if (next && !window.localStorage.getItem(`sah-milestone-${next.id}`)) {
        window.localStorage.setItem(`sah-milestone-${next.id}`, "1");
        setMilestone(next);
      }
    }
    milestoneSnapshot.current = current;
  }, [currentLevelName, journalCount, milestone, streakCurrent]);

  useEffect(() => () => {
    if (transitionCueTimer.current) window.clearTimeout(transitionCueTimer.current);
  }, []);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const activeUser = user || initialUser;
  const activeProfile = profile || initialProfile;
  if (isAuthLoading && !initialUser) return <AppLoading />;
  if (!session && !activeUser) return <LoginScreen />;

  const navigate = (next: string, cue?: GrowthNavigationCue) => {
    if (cue && !reducedMotion) {
      if (transitionCueTimer.current) window.clearTimeout(transitionCueTimer.current);
      setTransitionCue({ ...cue, nonce: Date.now() });
      transitionCueTimer.current = window.setTimeout(() => setTransitionCue(null), 520);
    }
    if (next === "quran" || next === "hadis") {
      openAppView("quran-companion", "wheel", { wisdom: "archive", archive: next === "quran" ? "verse" : "hadith" });
    } else if (next === "daily-wheel") {
      openAppView("quran-companion", "wheel", { wisdom: "verse" });
    } else if (next === "matrix" || next === "sukur" || next === "lessons") {
      openAppView("journal", next);
    } else if (next === "journal") {
      setView("journal");
    } else if (next === "depot") {
      setView("dashboard");
    } else {
      setView(next as ViewKey);
    }
    setMoreOpen(false);
    setProfileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const changeTheme = (preference: "light" | "dark" | "system") => {
    const next =
      preference === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : preference;
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("sah-theme-preference", preference);
  };
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    changeTheme(next);
    if (activeProfile) {
      useAuthStore.getState().patchProfile({ theme_preference: next });
      void supabase.from("profiles").update({ theme_preference: next }).eq("id", activeProfile.id);
    }
  };
  const openPage = (path: string) => {
    setMoreOpen(false);
    setProfileOpen(false);
    window.location.assign(path);
  };
  const avatarUrl =
    activeProfile?.avatar_url ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(activeProfile?.display_name || "Yolcu")}`;

  return (
    <div className={`core-app ${view === "focus" ? "focus-mode" : ""}`}>
      {activeProfile?.created_at && (
        <WelcomeGuide
          profileId={activeProfile.id}
          createdAt={activeProfile.created_at}
          completed={
            onboardingPreview ? false : activeProfile.onboarding_completed
          }
          preview={onboardingPreview}
          onComplete={() =>
            useAuthStore.getState().patchProfile({ onboarding_completed: true })
          }
          onStart={() => navigate("journal")}
        />
      )}

      <aside className="app-sidebar" aria-label="Ana navigasyon">
        <button
          className="brand sidebar-brand"
          onClick={() => navigate("dashboard")}
          aria-label="SAH ana sayfa"
        >
          <span className="brand-mark">S</span>
          <span>
            <strong>SAH</strong>
          </span>
        </button>

        <nav className="sidebar-nav">
          <section aria-label="Ana bölümler">
            <p>ANA BÖLÜMLER</p>
            {navigationItems.map((item) => (
              <button
                key={item.id}
                className={view === item.id ? "active" : ""}
                onClick={() => navigate(item.id)}
                aria-current={view === item.id ? "page" : undefined}
              >
                <AppIcon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </section>
        </nav>

        <div className="sidebar-support">
          <button onClick={() => openPage("/feedback")}>
            <AppIcon name="message-heart" />
            <span>Görüş ve Öneri</span>
          </button>
          <p>
            <AppIcon name="lock" /> Özel kayıtların yalnızca sana görünür.
          </p>
          <div className="sidebar-legal">
            <a href="/gizlilik">Gizlilik</a>
            <span>·</span>
            <a href="/kullanim-kosullari">Koşullar</a>
          </div>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-header">
          <button
            className="mobile-brand"
            onClick={() => navigate("dashboard")}
            aria-label="SAH ana sayfa"
          >
            <span className="brand-mark">S</span>
            <strong>SAH</strong>
          </button>
          <div className="route-context">
            <span>SAH World</span>
            <strong>{viewLabels[view] ?? "Kişisel alan"}</strong>
          </div>
          <div className="header-actions" ref={profileMenuRef}>
            <button
              className="global-search-button"
              onClick={() => setSearchOpen(true)}
              aria-label="Her yerde ara"
            >
              <AppIcon name="search" />
              <span>Her yerde ara</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              className="header-feedback"
              onClick={() => openPage("/feedback")}
            >
              <AppIcon name="message-heart" />
              <span>Görüş bırak</span>
            </button>
            <button
              className="profile-button"
              onClick={() => setProfileOpen((value) => !value)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              <AvatarImage src={avatarUrl} size={48} priority />
              <span>
                <strong>{activeProfile?.display_name || "Yolcu"}</strong>
                <small>
                  {level.name} · {store.xp} XH
                </small>
              </span>
              <AppIcon name="chevron-down" />
            </button>
            {profileOpen && (
              <div className="profile-popover" role="menu">
                <div className="profile-summary">
                  <AvatarImage src={avatarUrl} size={48} />
                  <span>
                    <strong>{activeProfile?.display_name || "Yolcu"}</strong>
                    <small>
                      {store.streak.current} günlük seri · {level.name}
                    </small>
                  </span>
                </div>
                <AwarenessProfileSummary onOpen={() => navigate("awareness")} />
                <ProfessionProfileSummary
                  onOpen={() => navigate("profession-school")}
                />
                <button role="menuitem" onClick={() => navigate("reports")}>
                  <AppIcon name="chart-histogram" /> Gelişim raporlarım
                </button>
                <button role="menuitem" onClick={() => navigate("community")}>
                  <AppIcon name="users-group" /> Topluluklarım
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    setSettingsOpen(true);
                  }}
                >
                  <AppIcon name="settings" /> Hesap ve gizlilik
                </button>
                <button role="menuitem" onClick={toggleTheme}>
                  <AppIcon name={theme === "light" ? "moon" : "sun"} />{" "}
                  {theme === "light" ? "Gece görünümü" : "Aydınlık görünüm"}
                </button>
                <button role="menuitem" onClick={() => openPage("/feedback")}>
                  <AppIcon name="message-heart" /> Görüş ve öneri
                </button>
                {activeUser?.app_metadata?.role === "admin" && (
                  <button
                    role="menuitem"
                    onClick={() => openPage("/admin/feedback")}
                  >
                    <AppIcon name="shield-check" /> Geri bildirim yönetimi
                  </button>
                )}
                <button
                  className="signout"
                  role="menuitem"
                  onClick={() => void supabase.auth.signOut()}
                >
                  <AppIcon name="logout" /> Oturumu kapat
                </button>
              </div>
            )}
          </div>
        </header>

        <AnimatePresence>
          {transitionCue && (
            <motion.div
              key={transitionCue.nonce}
              className="context-navigation-cue"
              style={{ '--navigation-accent': transitionCue.accent } as CSSProperties}
              initial={{ opacity: 0, scaleX: 0.04 }}
              animate={{ opacity: [0, 0.62, 0], scaleX: [0.04, 1, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
              aria-hidden="true"
            >
              <span><AppIcon name={transitionCue.icon} />{transitionCue.label}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="app-main" id="main-content">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              className="view-motion-shell"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {view === "dashboard" ? (
                <DashboardView onNavigate={navigate} />
              ) : view === "growth" ? (
                <DashboardView onNavigate={navigate} />
              ) : view === "reports" ? (
                <ReportsView />
              ) : view === "community" ? (
                <CommunityErrorBoundary>
                  <CommunityView />
                </CommunityErrorBoundary>
              ) : view === "quran-companion" ? (
                <QuranCompanionView
                  onNavigate={navigate}
                />
              ) : view === "journal" ? (
                <JournalHubView
                  onNavigate={navigate}
                />
              ) : view === "focus" ? (
                <FocusTimerView
                  onExit={() => navigate("dashboard")}
                  onNavigate={navigate}
                />
              ) : view === "awareness" ? (
                <AwarenessView onNavigate={navigate} />
              ) : view === "profession-school" ? (
                <ProfessionSchoolView onNavigate={navigate} />
              ) : (
                <SectionView section={view} onNavigate={navigate} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobil navigasyon">
        {navigationItems.slice(0, 4).map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "active" : ""}
            onClick={() => navigate(item.id)}
            aria-current={view === item.id ? "page" : undefined}
          >
            <AppIcon name={item.icon} />
            <span>
              {item.label === "Kur’an’ı Kerim Kardeşim" ? "Kur’an" : item.label}
            </span>
          </button>
        ))}
        <button
          className={moreOpen ? "active" : ""}
          onClick={() => setMoreOpen((value) => !value)}
          aria-expanded={moreOpen}
        >
          <AppIcon name="dots" />
          <span>Daha</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="mobile-more" role="dialog" aria-label="Diğer bölümler">
          {navigationItems.slice(4).map((item) => (
            <button key={item.id} onClick={() => navigate(item.id)}>
              <AppIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
          <button onClick={() => openPage("/feedback")}>
            <AppIcon name="message-heart" />
            <span>Görüş</span>
          </button>
          {activeUser?.app_metadata?.role === "admin" && (
            <button onClick={() => openPage("/admin/feedback")}>
              <AppIcon name="shield-check" />
              <span>Yönetim</span>
            </button>
          )}
        </div>
      )}
      <CommandPalette
        open={searchOpen}
        onClose={closeSearch}
        onNavigate={navigate}
      />
      {settingsOpen && (
        <AccountSettingsDialog
          onClose={() => setSettingsOpen(false)}
          onThemeChange={changeTheme}
        />
      )}
      <MilestoneCelebration
        milestone={milestone}
        onClose={() => setMilestone(null)}
      />
    </div>
  );
}

function AppLoading() {
  return (
    <main className="app-loader" aria-busy="true" aria-live="polite">
      <span className="brand-mark">S</span>
      <div className="skeleton-stack">
        <i />
        <i />
        <i />
      </div>
      <p>Güvenli alanın hazırlanıyor…</p>
    </main>
  );
}

function DashboardLoading() {
  return (
    <div className="dashboard-preloader loading-static" role="status" aria-live="polite" aria-label="SAH alanın hazırlanıyor">
      <div className="preloader-mark"><span>S</span><i /><i /></div>
      <div className="preloader-wordmark"><strong>SAH</strong><span>Kendine ait alan hazırlanıyor</span></div>
      <div className="preloader-line"><span /></div>
    </div>
  );
}

function ViewSkeleton() {
  return (
    <div className="view-skeleton" aria-busy="true" aria-live="polite">
      <span />
      <span />
      <div>
        <i />
        <i />
        <i />
      </div>
      <p>İçerik hazırlanıyor…</p>
    </div>
  );
}
