// Works left off the map, and what would bring each in; the README's Data
// section has the rules. Shown in the About dialog. When a new work ties
// one of these to the map, move it into works.ts.

// Which rule keeps a work off: no line to the MCU, no official title or
// year yet, an announcement not yet confirmed, or an extra.
export type OffMapReason = "unlinked" | "undated" | "unconfirmed" | "extra";

export interface OffMapWork {
  title: string;
  titleJa: string;
  // "2003", "2017–2019", or "TBA".
  years: string;
  reason: OffMapReason;
  // What would bring it onto the map.
  until: { en: string; ja: string };
  // It was on the map once; its full entry is in git history (59762a9).
  removed?: true;
}

export const NOT_ON_THE_MAP: OffMapWork[] = [
  // --- Taken off the map: no line to the MCU ---
  {
    title: "Hulk",
    titleJa: "ハルク",
    years: "2003",
    reason: "unlinked",
    until: {
      en: "An MCU work brings back Eric Bana's Hulk",
      ja: "MCU 作品がエリック・バナ版ハルクを呼び戻したら",
    },
    removed: true,
  },
  {
    title: "Ghost Rider, Ghost Rider: Spirit of Vengeance",
    titleJa: "ゴーストライダー、ゴーストライダー2",
    years: "2007–2011",
    reason: "unlinked",
    until: {
      en: "An MCU work brings back Nicolas Cage's Ghost Rider",
      ja: "MCU 作品がニコラス・ケイジ版ゴーストライダーを呼び戻したら",
    },
    removed: true,
  },
  {
    title: "Fantastic Four (2015)",
    titleJa: "ファンタスティック・フォー（2015）",
    years: "2015",
    reason: "unlinked",
    until: {
      en: "An MCU work brings back its Fantastic Four",
      ja: "MCU 作品がこのファンタスティック・フォーを呼び戻したら",
    },
    removed: true,
  },
  {
    title: "The Punisher (1989), The Punisher (2004), Punisher: War Zone",
    titleJa: "パニッシャー（1989）、パニッシャー（2004）、パニッシャー：ウォー・ゾーン",
    years: "1989–2008",
    reason: "unlinked",
    until: {
      en: "An MCU work brings back one of their Punishers",
      ja: "MCU 作品がいずれかのパニッシャーを呼び戻したら",
    },
    removed: true,
  },
  {
    title: "Legion",
    titleJa: "レギオン",
    years: "2017–2019",
    reason: "unlinked",
    until: { en: "A work on the map ties into it", ja: "マップ上の作品とつながったら" },
    removed: true,
  },
  {
    title: "The Gifted",
    titleJa: "ギフテッド 新世代X-MEN誕生",
    years: "2017–2018",
    reason: "unlinked",
    until: { en: "A work on the map ties into it", ja: "マップ上の作品とつながったら" },
    removed: true,
  },
  {
    title: "X-Men '97",
    titleJa: "X-MEN '97",
    years: "2024–2027",
    reason: "unlinked",
    until: {
      en: "X-Men: The Animated Series comes on, or the MCU crosses into its world",
      ja: "前作のアニメが載るか、MCU がその世界とつながったら",
    },
    removed: true,
  },
  {
    title: "Spider-Noir",
    titleJa: "スパイダー・ノワール",
    years: "2026",
    reason: "unlinked",
    until: {
      en: "It ties into the Spider-Verse films or the MCU",
      ja: "スパイダーバース映画か MCU とつながったら",
    },
    removed: true,
  },

  // --- Never added: no line to the MCU ---
  {
    title: "X-Men: The Animated Series",
    titleJa: "X-メン（アニメシリーズ）",
    years: "1992–1997",
    reason: "unlinked",
    until: {
      en: "A work on the map crosses into its world (Earth-92131)",
      ja: "マップ上の作品がその世界（アース92131）とつながったら",
    },
  },
  {
    title: "Spider-Man: The Animated Series",
    titleJa: "スパイダーマン（アニメシリーズ）",
    years: "1994–1998",
    reason: "unlinked",
    until: {
      en: "X-Men: The Animated Series comes on first",
      ja: "先に X-メン（アニメシリーズ）が載ったら",
    },
  },
  {
    title: "Howard the Duck, Captain America (1990), The Fantastic Four (1994), Man-Thing",
    titleJa:
      "ハワード・ザ・ダック、キャプテン・アメリカ（1990）、ザ・ファンタスティック・フォー（1994）、マンシング",
    years: "1986–2005",
    reason: "unlinked",
    until: { en: "An MCU work brings one back", ja: "MCU 作品が呼び戻したら" },
  },
  {
    title:
      "Live-action TV of the 1970s–2000s (The Incredible Hulk, The Amazing Spider-Man, Doctor Strange, Nick Fury, Generation X, Blade: The Series, …)",
    titleJa:
      "1970〜2000年代の実写ドラマ（超人ハルク、スパイダーマン、ドクター・ストレンジ、ニック・フューリー、ジェネレーションX、ブレイド ザ・シリーズ など）",
    years: "1977–2006",
    reason: "unlinked",
    until: { en: "An MCU work brings one back", ja: "MCU 作品が呼び戻したら" },
  },
  {
    title:
      "Other Marvel animation (X-Men: Evolution, The Spectacular Spider-Man, The Avengers: Earth's Mightiest Heroes, M.O.D.O.K., Hit-Monkey, …)",
    titleJa:
      "その他のマーベルアニメ（X-MEN エボリューション、スペクタキュラー・スパイダーマン、アベンジャーズ・ザ・ヒーローズ、M.O.D.O.K.、ヒットモンキー など）",
    years: "",
    reason: "unlinked",
    until: { en: "An MCU work crosses into its world", ja: "MCU 作品がその世界とつながったら" },
  },

  // --- Waiting on a title, a year or confirmation ---
  {
    title: "Armor Wars",
    titleJa: "アーマー・ウォーズ",
    years: "TBA",
    reason: "undated",
    until: { en: "It gets a year", ja: "公開年が決まったら" },
  },
  {
    title: "Untitled Nova film",
    titleJa: "ノヴァの映画（タイトル未定）",
    years: "TBA",
    reason: "undated",
    until: { en: "It gets a title and a year", ja: "タイトルと公開年が決まったら" },
  },
  {
    title: "Untitled Shang-Chi sequel",
    titleJa: "シャン・チー続編（タイトル未定）",
    years: "TBA",
    reason: "undated",
    until: { en: "It gets a title and a year", ja: "タイトルと公開年が決まったら" },
  },
  {
    title: "Marvel Zombies: The Winter Soldier, The Fist of Khonshu, The Last Guardian",
    titleJa:
      "マーベル・ゾンビーズの続編（The Winter Soldier、The Fist of Khonshu、The Last Guardian）",
    years: "2027–2029",
    reason: "unconfirmed",
    until: {
      en: "Marvel confirms the titles and years",
      ja: "公式にタイトルと公開年が確認できたら",
    },
  },
  {
    title: "Zodiac",
    titleJa: "Zodiac",
    years: "2028",
    reason: "unconfirmed",
    until: { en: "Marvel confirms it", ja: "公式に確認できたら" },
  },
  {
    title: "Your Friendly Neighborhood Spider-Man — Seasons 3–4",
    titleJa: "スパイダーマン：フレンドリー・ネイバーフッド — シーズン3・4",
    years: "2028–2029",
    reason: "unconfirmed",
    until: { en: "Marvel confirms them", ja: "公式に確認できたら" },
  },

  // --- Extras ---
  {
    title:
      "Web series: Agents of S.H.I.E.L.D. (Declassified, Double Agent, Academy, Slingshot), WHIH Newsfront, The Daily Bugle",
    titleJa:
      "ウェブシリーズ：エージェント・オブ・シールド（Declassified、Double Agent、Academy、Slingshot）、WHIH Newsfront、The Daily Bugle",
    years: "2013–2021",
    reason: "extra",
    until: { en: "A work on the map builds on one", ja: "マップ上の作品がその内容を前提にしたら" },
  },
];
