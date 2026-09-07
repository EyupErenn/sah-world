"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const steps = [
  {
    icon: "✦",
    eyebrow: "1 / 3 · Alanın",
    title: "SAH senin kişisel alanın",
    text: "Günlük, hedef, şükür ve manevi notlarını tek bir sakin düzende tutarsın.",
  },
  {
    icon: "↗",
    eyebrow: "2 / 3 · İlerlemen",
    title: "Her kayıt gelişime dönüşür",
    text: "Tutarlılığın XH, seviye ve seri olarak görünür; Evren kartın seninle birlikte büyür.",
  },
  {
    icon: "◎",
    eyebrow: "3 / 3 · İlk adım",
    title: "Küçük bir kayıtla başla",
    text: "Bugün aklında kalan bir cümleyi günlüğüne yaz. Kusursuz olmasına gerek yok.",
  },
];

export default function WelcomeGuide({
  profileId,
  createdAt,
  completed,
  preview = false,
  onComplete,
  onStart,
}: {
  profileId: string;
  createdAt: string;
  completed?: boolean;
  preview?: boolean;
  onComplete: () => void;
  onStart: () => void;
}) {
  const [step, setStep] = useState(0);
  const [closed, setClosed] = useState(true);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (finished) return;
    const legacyComplete =
      !preview && localStorage.getItem("sah-welcome-complete") === "true";
    const isNew =
      Date.now() - new Date(createdAt).getTime() < 30 * 24 * 60 * 60 * 1000;
    queueMicrotask(() =>
      setClosed(Boolean((completed && !preview) || legacyComplete || !isNew)),
    );
  }, [completed, createdAt, finished, preview]);
  if (closed) return null;

  const finish = async (start = false) => {
    setSaving(true);
    setError("");
    if (!preview && profileId !== "guest-user-123") {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", profileId);
      if (updateError) {
        setError("Tercihin kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
        setSaving(false);
        return;
      }
    }
    if (!preview) localStorage.setItem("sah-welcome-complete", "true");
    setFinished(true);
    onComplete();
    setClosed(true);
    if (start) onStart();
    setSaving(false);
  };
  const current = steps[step];
  return (
    <div
      className="welcome-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <section className="welcome-card">
        <button
          className="welcome-skip"
          type="button"
          disabled={saving}
          onClick={() => void finish()}
        >
          Atla
        </button>
        <div className="welcome-visual">
          <span>{current.icon}</span>
          <i />
          <i />
        </div>
        <p className="eyebrow">{current.eyebrow}</p>
        <h2 id="welcome-title">{current.title}</h2>
        <p>{current.text}</p>
        {error && <p className="welcome-error" role="alert">{error}</p>}
        <div className="welcome-dots">
          {steps.map((_, index) => (
            <i key={index} className={index === step ? "active" : ""} />
          ))}
        </div>
        <button
          className="primary-button"
          type="button"
          disabled={saving}
          onClick={() =>
            step === steps.length - 1
              ? void finish(true)
              : setStep((value) => value + 1)
          }
        >
          {saving
            ? "Kaydediliyor…"
            : step === steps.length - 1
              ? "İlk kaydımı oluştur"
              : "Devam et"} {saving ? "" : "→"}
        </button>
      </section>
    </div>
  );
}
