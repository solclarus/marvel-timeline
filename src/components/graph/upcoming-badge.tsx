import { CalendarClock } from "lucide-react";

import { isUpcoming, type WorkNode } from "@/data/works";
import { useI18n } from "@/lib/i18n";

// "Coming Oct 14, 2026" for a work not out yet; only in the detail card and
// dialog, so the map stays uncluttered. Dates announced only to the month or
// year show just that.
export function UpcomingBadge({ work }: { work: WorkNode }) {
  const { t, locale } = useI18n();
  if (!isUpcoming(work)) return null;
  const [year, month, day] = work.releaseDate.split("-").map(Number);
  const date = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: work.releasePrecision === "year" ? undefined : work.releasePrecision ? "long" : "short",
    day: work.releasePrecision ? undefined : "numeric",
  }).format(new Date(year, month - 1, day));
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-foreground/80">
      <CalendarClock className="size-3" aria-hidden />
      {t.upcoming} {date}
    </span>
  );
}
