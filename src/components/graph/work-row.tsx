import { EARTH_META, FRANCHISE_META, notableEarthsOf, type WorkNode } from "@/data/works";
import { useI18n } from "@/lib/i18n";
import { runtimeOf } from "@/lib/runtime";
import { cn } from "@/lib/utils";

import { MediumBadge } from "./medium-badge";
import { Poster } from "./poster";

export type RowTag = { label: string; tone: "before" | "after" | "plain" };

const TAG_TONE: Record<RowTag["tone"], string> = {
  before: "border-marquee/40 text-marquee",
  after: "border-white/20 text-foreground/80",
  plain: "border-white/10 text-muted-foreground",
};

// One work as a card-like row: poster, title, then kind, franchise, phase,
// year, running time and any Earths besides the franchise's own. Shared by
// the list view and the watch lists.
// `number` adds a step number on the left; `tag` a pill on the right.
export function WorkRow({
  work,
  number,
  tag,
  selected = false,
  dimmed = false,
  onSelect,
  id,
}: {
  work: WorkNode;
  number?: number;
  tag?: RowTag;
  selected?: boolean;
  dimmed?: boolean;
  onSelect: (id: string) => void;
  id?: string;
}) {
  const { t, titleOf, franchiseLabel, earthLabel } = useI18n();
  const runtime = runtimeOf(work);
  return (
    <li id={id}>
      <button
        type="button"
        onClick={() => onSelect(work.id)}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-center gap-3 rounded-item border p-2 text-left transition-[opacity,background-color,border-color] duration-200 focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none",
          selected
            ? "border-white/40 bg-white/10"
            : "border-transparent bg-white/5 hover:bg-white/9",
          dimmed && "opacity-35",
        )}
      >
        {number !== undefined && (
          <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {number}
          </span>
        )}
        <span className="relative block h-18 w-12 shrink-0 overflow-hidden rounded-thumb bg-muted">
          <Poster key={work.id} work={work} compact />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm/snug font-medium">{titleOf(work)}</span>
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
        {tag && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              TAG_TONE[tag.tone],
            )}
          >
            {tag.label}
          </span>
        )}
      </button>
    </li>
  );
}
