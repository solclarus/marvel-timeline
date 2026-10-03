// Short themed paths through the map, for viewers who want one storyline
// rather than everything. A route lists its works, or names a goal and takes
// the goal's direct prerequisites; either way the app puts them in watch
// order (see `routeWorks`).
export interface Route {
  id: string;
  title: string;
  titleJa: string;
  summary: string;
  summaryJa: string;
  works?: string[];
  // The goal plus only what it builds on directly.
  goal?: string;
}

export const ROUTES: Route[] = [
  {
    id: "doomsday-direct",
    title: "Straight to Doomsday",
    titleJa: "ドゥームズデイ直行ルート",
    summary: "Avengers: Doomsday and only the works it builds on directly.",
    summaryJa: "『アベンジャーズ／ドゥームズデイ』と、その直前の前提作品だけ。",
    goal: "avengers-doomsday",
  },
  {
    id: "mcu-spider-man",
    title: "The MCU's Spider-Man",
    titleJa: "MCUのスパイダーマン",
    summary: "Tom Holland's Peter Parker, from Civil War to Brand New Day.",
    summaryJa: "トム・ホランド版ピーター・パーカー。シビル・ウォーからブランド・ニュー・デイまで。",
    works: [
      "captain-america-civil-war",
      "spider-man-homecoming",
      "avengers-infinity-war",
      "avengers-endgame",
      "spider-man-far-from-home",
      "spider-man-no-way-home",
      "spider-man-brand-new-day",
    ],
  },
  {
    id: "fox-x-men",
    title: "Fox's X-Men",
    titleJa: "FOXのX-MEN",
    summary: "The X-Men films from 2000 on, through Deadpool & Wolverine.",
    summaryJa: "2000年からのX-MEN映画シリーズ。『デッドプール＆ウルヴァリン』まで。",
    works: [
      "x-men",
      "x2",
      "x-men-last-stand",
      "x-men-origins-wolverine",
      "x-men-first-class",
      "the-wolverine",
      "x-men-days-of-future-past",
      "deadpool",
      "x-men-apocalypse",
      "logan",
      "deadpool-2",
      "dark-phoenix",
      "new-mutants",
      "deadpool-and-wolverine",
    ],
  },
  {
    id: "defenders",
    title: "The Defenders Saga",
    titleJa: "ディフェンダーズ・サーガ",
    summary: "Netflix's street-level heroes, on into Daredevil: Born Again.",
    summaryJa: "Netflixのストリートレベルのヒーローたち。『デアデビル：ボーン・アゲイン』へ。",
    works: [
      "daredevil-s1",
      "jessica-jones-s1",
      "daredevil-s2",
      "luke-cage-s1",
      "iron-fist-s1",
      "the-defenders",
      "the-punisher-s1",
      "jessica-jones-s2",
      "luke-cage-s2",
      "iron-fist-s2",
      "daredevil-s3",
      "the-punisher-s2",
      "jessica-jones-s3",
      "daredevil-born-again-s1",
    ],
  },
];
