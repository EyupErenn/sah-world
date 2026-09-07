export type PrimarySection =
  | "focus"
  | "quran-companion"
  | "mescidim"
  | "journal"
  | "awareness"
  | "reports"
  | "profession-school";

export type SectionTagline = {
  text: string;
  source: string;
  href: string;
  kind: "ayet" | "hadis";
};

/**
 * Launch navigation quotations. Wording and references were checked against
 * Diyanet's Kur'an Yolu / Hadislerle İslam pages on 7 September 2026.
 * The disputed “itkan” attribution is deliberately not used.
 */
export const SECTION_TAGLINES: Record<PrimarySection, SectionTagline> = {
  journal: {
    text: "Allah katında amellerin en sevimlisi, az da olsa devamlı olanıdır.",
    source: "Buhârî, Rikāk, 18; Müslim, Müsâfirîn, 218",
    href: "https://hadislerleislam.diyanet.gov.tr/sayfa.php?CILT=3&SAYFA=199",
    kind: "hadis",
  },
  focus: {
    text: "İki nimet vardır ki insanların çoğu onları değerlendirme hususunda aldanmıştır: Sağlık ve boş vakit.",
    source: "Buhârî, Rikāk, 1 (B6412)",
    href: "https://hadislerleislam.diyanet.gov.tr/sayfa.php?CILT=3&SAYFA=515",
    kind: "hadis",
  },
  "quran-companion": {
    text: "Sizin en hayırlınız, Kur’an’ı öğrenen ve öğretendir.",
    source: "Buhârî, Fedâilü’l-Kur’ân, 21 (B5027)",
    href: "https://hadislerleislam.diyanet.gov.tr/sayfa.php?CILT=1&SAYFA=553",
    kind: "hadis",
  },
  mescidim: {
    text: "Allah’ın mescidlerini ancak Allah’a ve âhiret gününe inanan, namazını kılan, zekâtını veren ve yalnız Allah’tan korkup çekinen kimseler imar edebilirler.",
    source: "Tevbe Sûresi, 9:18 · Kur’an Yolu Meali",
    href: "https://kuran.diyanet.gov.tr/tefsir/Tevbe-suresi/1252/17-22-ayet-tefsiri",
    kind: "ayet",
  },
  awareness: {
    text: "Zulmedenlere meyletmeyin. Yoksa size de ateş dokunur.",
    source: "Hûd Sûresi, 11:113 · Diyanet İşleri Başkanlığı Meali",
    href: "https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/hud-suresi-11/ayet-112/diyanet-isleri-baskanligi-meali-1",
    kind: "ayet",
  },
  reports: {
    text: "Herkes yarın için ne hazırladığına baksın!",
    source: "Haşr Sûresi, 59:18 · Kur’an Yolu Meali",
    href: "https://kuran.diyanet.gov.tr/tefsir/Ha%C5%9Fr-suresi/5144/18-20-ayet-tefsiri",
    kind: "ayet",
  },
  "profession-school": {
    text: "Rabbimiz! Bize bu dünyada da iyilik ver, öteki dünyada da iyilik ver; bizi cehennem azabından koru.",
    source: "Bakara Sûresi, 2:201 · Kur’an Yolu Meali",
    href: "https://kuran.diyanet.gov.tr/tefsir/Bakara-suresi/207/200-202-ayet-tefsiri",
    kind: "ayet",
  },
};
