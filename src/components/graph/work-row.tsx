import { EARTH_META, earthsOf, FRANCHISE_META, type WorkNode } from "@/data/works";
import { useI18n } from "@/lib/i18n";
import { runtimeOf } from "@/lib/runtime";
import { cn } from "@/lib/utils";

import { MediumBadge } from "./medium-badge";
import { Poster } from "./poster";

export type RowTag = { label: string; tone: "before" | "after" | "plain" };

const TAG_TONE: Record<RowTag["tone"], string> = {
  before: "border-amber-400/40 text-amber-200",
  after: "border-sky-400/40 text-sky-200",
  plain: "border-white/20 text-muted-foreground",
};

// One work as a card-like row: poster, title, kind, franchise, phase, year,
// running time and Earths. Shared by the list view and the watch lists.
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
          "flex w-full items-center gap-3 rounded-item border p-2 text-left transition-[opacity,background-color,border-color] duration-200 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none",
          selected
            ? "border-white/40 bg-white/10"
            : "border-transparent bg-white/[0.05] hover:bg-white/[0.09]",
          dimmed && "opacity-35",
        )}
      >
        {number !== undefined && (
          <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {number}
          </span>
        )}
        <span className="relative block h-[72px] w-12 shrink-0 overflow-hidden rounded-thumb bg-muted">
          <Poster key={work.id} work={work} compact />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm leading-snug font-medium">{titleOf(work)}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
            <MediumBadge work={work} />
            <span
              className={`size-1.5 shrink-0 rounded-full ${FRANCHISE_META[work.franchise].colorClass}`}
            />
            {franchiseLabel(work.franchise)}
            {work.phase !== undefined && <span>· {t.phase(work.phase)}</span>}
            <span className="tabular-nums">· {work.releaseDate.slice(0, 4)}</span>
            {runtime && <span className="tabular-nums">· {t.duration(runtime.minutes)}</span>}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground/80">
            {earthsOf(work).map((earth) => (
              <span key={earth} className="flex items-center gap-1">
                <span className={`size-1.5 rounded-full ${EARTH_META[earth].colorClass}`} />
                {earthLabel(earth)}
              </span>
            ))}
          </span>
        </span>
        {tag && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
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
