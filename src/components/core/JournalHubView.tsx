"use client";

import { useState } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import SectionTagline from "./SectionTagline";
import SectionView from "./SectionView";

export type JournalHubTab = "journal" | "matrix" | "sukur" | "lessons";

const tabs: Array<{
  id: JournalHubTab;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}> = [
  {
    id: "journal",
    label: "Günlük Yaz",
    shortLabel: "Günlük",
    icon: "notebook",
    description: "Ritüeller, sayfalar ve hatıralar",
  },
  {
    id: "matrix",
    label: "Öncelik Matrisim",
    shortLabel: "Matris",
    icon: "layout-grid",
    description: "Acil ve önemli olanı ayır",
  },
  {
    id: "sukur",
    label: "Şükür Defterim",
    shortLabel: "Şükür",
    icon: "sparkles",
    description: "Nimetleri fark et ve kaydet",
  },
  {
    id: "lessons",
    label: "Hatalar ve Dersler",
    shortLabel: "Dersler",
    icon: "history",
    description: "Şefkatli muhasebe alanı",
  },
];

export default function JournalHubView({
  initialTab = "journal",
  onNavigate,
}: {
  initialTab?: JournalHubTab;
  onNavigate: (view: string) => void;
}) {
  const [tab, setTab] = useState<JournalHubTab>(initialTab);

  return (
    <div className="view-stack journal-hub">
      <header className="page-heading journal-hub-heading">
        <div>
          <span className="eyebrow">KENDİNE DÖN · FARK ET · DÜZENLE</span>
          <h1>Günlük</h1>
          <p>
            Günün izlerini, önceliklerini, şükrünü ve öğrendiğin dersleri
            birbirini tamamlayan tek bir defterde tut.
          </p>
        </div>
        <SectionTagline section="journal" compact />
      </header>
      <nav
        className="journal-hub-tabs"
        aria-label="Günlük alanları"
        role="tablist"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            <span>
              <AppIcon name={item.icon} />
            </span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </button>
        ))}
      </nav>
      <section
        className="journal-tab-panel"
        role="tabpanel"
        aria-label={tabs.find((item) => item.id === tab)?.label}
      >
        <SectionView section={tab} onNavigate={onNavigate} embedded />
      </section>
    </div>
  );
}
