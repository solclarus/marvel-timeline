import { Film, Sparkles, Tv } from "lucide-react";

import { mediumOf, type Medium, type WorkNode } from "@/data/works";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const MEDIUM_META: Record<
  Medium,
  { label: "mediumMovie" | "mediumSeries" | "mediumAnimation"; icon: typeof Film }
> = {
  movie: { label: "mediumMovie", icon: Film },
  series: { label: "mediumSeries", icon: Tv },
  animation: { label: "mediumAnimation", icon: Sparkles },
};

// Film, series or animation, as a small pill.
export function MediumBadge({ work, className }: { work: WorkNode; className?: string }) {
  const { t } = useI18n();
  const { label, icon: Icon } = MEDIUM_META[mediumOf(work)];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full whitespace-nowrap border border-white/15 px-1.5 py-px text-[10px]/4  font-medium text-foreground/80",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {t[label]}
    </span>
  );
}
