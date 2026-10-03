import { createContext, useContext, useEffect, useState } from "react";

import {
  EARTH_META,
  FRANCHISE_META,
  type EarthId,
  type Franchise,
  type WorkNode,
} from "@/data/works";

export type Locale = "en" | "ja";
export const LOCALES: Locale[] = ["en", "ja"];
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ja: "日本語" };

const STORAGE_KEY = "marvel-timeline:locale";

const en = {
  // Command bar
  searchLabel: "Search works",
  searchPlaceholder: "Search works…",
  noMatches: "No matches",
  tvBadge: "TV",
  viewLabel: (mode: string) => `View: ${mode}`,
  modeRecommended: "ORDER",
  modeRelease: "RELEASE",
  modeChronology: "TIMELINE",
  mediaAll: "ALL",
  mediaMovies: "MOVIES",
  mediaAllTitle: "Films and series",
  mediaMoviesTitle: "Films only",
  mediaShowMovies: "Showing films and series. Show films only",
  mediaShowAll: "Showing films only. Show series too",
  // Settings menu
  viewSettings: "View settings",
  highlight: "Highlight",
  allRelated: "All related",
  directOnly: "Direct only",
  groupBy: "Group by",
  franchise: "Franchise",
  earth: "Earth",
  lines: "Lines",
  linePrerequisite: "Watch first",
  linePrerequisiteDetail: "sequel, spin-off, lead-in, crossover",
  lineReference: "Reference only",
  lineReferenceDetail: "not a prerequisite",
  language: "Language",
  // Map
  phase: (n: number) => `Phase ${n}`,
  decade: (decade: number) => `${decade}s`,
  workCount: (n: number) => `${n} ${n === 1 ? "work" : "works"}`,
  clearSelection: "Clear selection",
  showDetails: (title: string) => `Show what to watch before ${title}`,
  watchFirst: "Watch first",
  watchFirstCount: (n: number) => `${n} ${n === 1 ? "work" : "works"}, in order`,
  nothingFirst: "Nothing to watch first — you can start here.",
  directTag: "Direct",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  fitToView: "Fit to view",
  // About
  about: "About",
  aboutTitle: "Marvel Timeline",
  aboutLead:
    "An unofficial map of how Marvel films and series connect, to help decide what to watch before what.",
  aboutData: "Data",
  aboutDataBody:
    "Release dates and posters come from TMDB. Connections between works and Earth designations are compiled by hand; Earth numbers not stated on screen follow the Marvel Database.",
  aboutRights: "Rights",
  aboutRightsBody:
    "This is a fan project, not affiliated with or endorsed by Marvel, Disney, Sony Pictures, Netflix, or 20th Century Studios. Titles, characters, and logos are trademarks of their owners; posters are © their respective studios and are shown via TMDB to identify each work.",
  aboutLicense: "License",
  aboutLicenseBody:
    "The source code is released under the MIT License. It does not cover the titles, posters, or trademarks above.",
  viewOnGitHub: "View on GitHub",
  close: "Close",
};

export type Messages = typeof en;

const ja: Messages = {
  searchLabel: "作品を検索",
  searchPlaceholder: "作品を検索…",
  noMatches: "見つかりません",
  tvBadge: "TV",
  viewLabel: (mode) => `表示: ${mode}`,
  modeRecommended: "おすすめ順",
  modeRelease: "公開順",
  modeChronology: "時系列",
  mediaAll: "すべて",
  mediaMovies: "映画のみ",
  mediaAllTitle: "映画とドラマ",
  mediaMoviesTitle: "映画のみ",
  mediaShowMovies: "映画とドラマを表示中。映画のみにする",
  mediaShowAll: "映画のみ表示中。ドラマも表示する",
  viewSettings: "表示設定",
  highlight: "ハイライト",
  allRelated: "関連作品すべて",
  directOnly: "直接の関係のみ",
  groupBy: "グループ",
  franchise: "フランチャイズ",
  earth: "アース",
  lines: "線",
  linePrerequisite: "先に観る作品",
  linePrerequisiteDetail: "続編・スピンオフ・前振り・クロスオーバー",
  lineReference: "参照のみ",
  lineReferenceDetail: "視聴の前提ではない",
  language: "言語",
  phase: (n) => `フェーズ${n}`,
  decade: (decade) => `${decade}年代`,
  workCount: (n) => `${n}作品`,
  clearSelection: "選択を解除",
  showDetails: (title) => `${title} の前に観る作品を表示`,
  watchFirst: "先に観る作品",
  watchFirstCount: (n) => `観る順に ${n} 作品`,
  nothingFirst: "先に観る作品はありません。ここから観られます。",
  directTag: "直接",
  zoomIn: "拡大",
  zoomOut: "縮小",
  fitToView: "全体を表示",
  about: "このサイトについて",
  aboutTitle: "Marvel Timeline",
  aboutLead:
    "マーベルの映画・ドラマのつながりを1枚にまとめた非公式マップです。どの作品の前に何を観ればいいかを確かめられます。",
  aboutData: "データ",
  aboutDataBody:
    "公開日とポスターは TMDB から取得しています。作品同士のつながりとアース番号は手作業でまとめたもので、作中で明示されていないアース番号は Marvel Database に従っています。",
  aboutRights: "権利表記",
  aboutRightsBody:
    "本サイトはファンによる非公式プロジェクトで、Marvel、Disney、Sony Pictures、Netflix、20th Century Studios とは関係がなく、承認も受けていません。作品名・キャラクター・ロゴは各権利者の商標です。ポスターの著作権は各スタジオに帰属し、作品を識別するために TMDB 経由で表示しています。",
  aboutLicense: "ライセンス",
  aboutLicenseBody:
    "ソースコードは MIT License で公開しています。上記の作品名・ポスター・商標はライセンスの対象外です。",
  viewOnGitHub: "GitHub で見る",
  close: "閉じる",
};

const MESSAGES: Record<Locale, Messages> = { en, ja };

// Franchise and Earth names: proper names stay as they are; descriptive ones
// are translated.
const FRANCHISE_JA: Record<Franchise, string> = {
  mcu: "MCU",
  defenders: "ディフェンダーズ・サーガ",
  "marvel-tv": "マーベル・テレビジョン",
  "fox-tv": "X-MEN ドラマ（FOX）",
  "x-men": "X-MEN（FOX）",
  legacy: "旧作マーベル",
  "spider-man-legacy": "旧スパイダーマン",
  ssu: "SSU",
  "spider-verse": "スパイダーバース",
  animation: "マーベル・アニメーション",
};

function earthLabelJa(earth: EarthId): string {
  return earth === "multiverse" ? "マルチバース" : `アース${earth}`;
}

// First visit: the browser's language; afterwards, the viewer's last choice.
function detectLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "ja") return saved;
  } catch {
    // Storage blocked: fall through to the browser's language.
  }
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

interface I18n {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
  titleOf: (work: WorkNode) => string;
  franchiseLabel: (franchise: Franchise) => string;
  earthLabel: (earth: EarthId) => string;
  // A group card's label: a franchise or an Earth key.
  groupLabel: (by: "franchise" | "earth", key: string) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not remembered, but still applied for this visit.
    }
  };

  const franchiseLabel = (f: Franchise) =>
    locale === "ja" ? FRANCHISE_JA[f] : FRANCHISE_META[f].label;
  const earthLabel = (e: EarthId) => (locale === "ja" ? earthLabelJa(e) : EARTH_META[e].label);

  const value: I18n = {
    locale,
    setLocale,
    t: MESSAGES[locale],
    titleOf: (work) => (locale === "ja" ? work.titleJa : work.title),
    franchiseLabel,
    earthLabel,
    groupLabel: (by, key) =>
      by === "franchise" ? franchiseLabel(key as Franchise) : earthLabel(key as EarthId),
  };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error("useI18n needs an <I18nProvider>");
  return i18n;
}
