import type { WorkNode } from "@/data/works";
import type { Locale } from "@/lib/i18n";

// A work's release date as people write it: "Apr 27, 2011" or "2011年4月27日".
// Dates announced only to the month or year show just that.
export function formatRelease(work: WorkNode, locale: Locale): string {
  const [year, month, day] = work.releaseDate.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: work.releasePrecision === "year" ? undefined : work.releasePrecision ? "long" : "short",
    day: work.releasePrecision ? undefined : "numeric",
  }).format(new Date(year, month - 1, day));
}
