// Marvel Studios works on TMDB that were looked at and left off the map, so
// `pnpm check:new` stops listing them. Keyed "movie/<id>", "tv/<id>" or
// "tv/<id>/season/<n>", each with why. `untilDated` brings one back once
// TMDB gives it a date (an announced title waiting for a year). A work that
// later ties in moves to works.ts (and out of here).
export interface Reviewed {
  why: string;
  untilDated?: true;
}

export const REVIEWED: Record<string, Reviewed> = {
  "tv/318417": { why: "Daredevil: Born Again Official Podcast — an extra" },
  "tv/332379": { why: "Countdown to Avengers: Doomsday Official Podcast — an extra" },
  "movie/1823245": { why: "VisionQuest Official Podcast — an extra" },
  "movie/1750432": {
    why: "Spidey and the Avengers: Halloween Team-Up! — preschool special, no line to the MCU",
  },
  "tv/297767": {
    why: "Marvel's Avengers: Mightiest Friends — preschool series, no line to the MCU",
  },
  "movie/1737233": { why: "Untitled Shang-Chi sequel — no official title", untilDated: true },
  "movie/1474568": { why: "Untitled Deadpool/X-Men film — no official title", untilDated: true },
  "movie/1731190": { why: "Nova — no year yet", untilDated: true },
  "tv/337844": { why: "Zodiac — no year yet", untilDated: true },
};
