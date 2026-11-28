import { Check } from "lucide-react";

import { EARTH_META, FRANCHISE_META, notableEarthsOf, type WorkNode } from "@/data/works";
import { useI18n } from "@/lib/i18n";
import { useNodeArt } from "@/lib/node-art";
import { runtimeOf } from "@/lib/runtime";
import { cn } from "@/lib/utils";
import { useWatched } from "@/lib/watched";

import { Logo } from "./logo";
import { MediumBadge } from "./medium-badge";
import { Poster } from "./poster";
import { WatchedMark } from "./watched-mark";

// One work as a card-like row: poster, title, then kind, franchise, phase,
// year, running time and any Earths besides the franchise's own. Shared by
// the list view and the watch lists.
// `number` adds a step number on the left.
// `check` turns the row into a checkbox, for picking several at once.
export function WorkRow({
  work,
  number,
  selected = false,
  dimmed = false,
  check,
  onSelect,
  id,
}: {
  work: WorkNode;
  number?: number;
  selected?: boolean;
  dimmed?: boolean;
  check?: { checked: boolean; disabled?: boolean };
  // The click comes along, for shift-click ranges.
  onSelect: (id: string, event: React.MouseEvent) => void;
  id?: string;
}) {
  const { t, titleOf, franchiseLabel, earthLabel } = useI18n();
  const runtime = runtimeOf(work);
  const watched = useWatched().has(work.id);
  const [art] = useNodeArt();
  return (
    <li id={id}>
      <button
        type="button"
        onClick={(event) => onSelect(work.id, event)}
        aria-pressed={check ? check.checked : selected}
        disabled={check?.disabled}
        className={cn(
          "flex w-full items-center gap-3 rounded-item border p-2 text-left transition-[opacity,background-color,border-color] duration-200 focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none",
          selected ? "border-tint/40 bg-tint/10" : "border-transparent bg-tint/5 hover:bg-tint/9",
          (dimmed || check?.disabled) && "opacity-35",
          check?.checked && "border-marquee/50 bg-marquee/10",
        )}
      >
        {check && (
          <span
            aria-hidden
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
              check.checked
                ? "border-marquee bg-marquee text-background"
                : "border-tint/30 bg-transparent text-transparent",
            )}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        )}
        {number !== undefined && (
          <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {number}
          </span>
        )}
        <span
          className={cn(
            "relative block shrink-0 overflow-hidden rounded-thumb bg-muted",
            art === "logo" ? "h-12 w-20" : "h-18 w-12",
          )}
        >
          {art === "logo" ? (
            <Logo key={work.id} work={work} />
          ) : (
            <Poster key={work.id} work={work} compact />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm/snug font-medium">
            {titleOf(work)}
            {watched && <span className="sr-only">{t.watchedSuffix}</span>}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
            <MediumBadge work={work} />
            <span
              className={`size-1.5 shrink-0 rounded-full ${FRANCHISE_META[work.franchise].colorClass}`}
            />
            {franchiseLabel(work.franchise)}
            {work.phase !== undefined && <span>· {t.phase(work.phase)}</span>}
            <span className="tabular-nums">· {work.releaseDate.slice(0, 4)}</span>
            {runtime && <span className="tabular-nums">· {t.duration(runtime.minutes)}</span>}
            {notableEarthsOf(work).map((earth) => (
              <span key={earth} className="flex items-center gap-1">
                · <span className={`size-1.5 rounded-full ${EARTH_META[earth].colorClass}`} />
                {earthLabel(earth)}
              </span>
            ))}
          </span>
        </span>
        {/* Watched: a check at the row's end, clear of the poster. */}
        {watched && (
          <WatchedMark className="size-5 shrink-0 bg-marquee text-background shadow-none" />
        )}
      </button>
    </li>
  );
}
