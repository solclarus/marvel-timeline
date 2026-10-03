import { useEffect } from "react";

import { EARTH_META, earthsOf, FRANCHISE_META, type WorkNode } from "@/data/works";
import type { Grouping } from "@/lib/graph/groups";
import type { ViewMode } from "@/lib/graph/layout";
import { listSections } from "@/lib/graph/list";
import type { WorkGraph } from "@/lib/graph/relations";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { MediumBadge } from "./medium-badge";
import { Poster } from "./poster";

interface Props {
  mode: ViewMode;
  grouping: Grouping;
  graph: WorkGraph;
  selectedId: string | null;
  // Highlighted works (a selection and its relatives), or null.
  activeSet: Set<string> | null;
  // Negative for what comes before the selection, positive for after.
  distances: Map<string, number>;
  onSelect: (id: string) => void;
}

// The map as a scrolling list, for small screens: every work in the view
// mode's order, split by saga or decade. Picking one highlights its
// relatives in place, the way the map does.
export function ListView({
  mode,
  grouping,
  graph,
  selectedId,
  activeSet,
  distances,
  onSelect,
}: Props) {
  const { t } = useI18n();
  const sections = listSections(mode, grouping, graph);

  // A selection made elsewhere (search, a route) scrolls into view.
  useEffect(() => {
    if (!selectedId) return;
    const row = document.getElementById(`list-${selectedId}`);
    const rect = row?.getBoundingClientRect();
    if (!row || !rect) return;
    // Clear of the detail panel above and the command bar below.
    if (rect.top < 140 || rect.bottom > window.innerHeight - 100) {
      row.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [selectedId]);

  return (
    <main
      className={cn(
        "h-dvh overflow-y-auto bg-neutral-800 px-3 pb-28 transition-[padding] duration-200 sm:px-6",
        selectedId ? "pt-36 sm:pt-44" : "pt-4",
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {sections.map((section) => (
          <section key={section.kind === "saga" ? section.saga : section.decade}>
            <h2 className="mb-2 flex items-baseline justify-between px-2 text-xs font-semibold tracking-wide text-muted-foreground">
              {section.kind === "saga" ? t.saga(section.saga) : t.decade(section.decade)}
              <span className="font-normal tabular-nums">{t.workCount(section.works.length)}</span>
            </h2>
            <ol className="flex flex-col gap-1">
              {section.works.map((work) => (
                <ListRow
                  key={work.id}
                  work={work}
                  selected={work.id === selectedId}
                  dimmed={activeSet !== null && !activeSet.has(work.id)}
                  distance={distances.get(work.id)}
                  onSelect={onSelect}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}

function ListRow({
  work,
  selected,
  dimmed,
  distance,
  onSelect,
}: {
  work: WorkNode;
  selected: boolean;
  dimmed: boolean;
  distance: number | undefined;
  onSelect: (id: string) => void;
}) {
  const { t, titleOf, franchiseLabel, earthLabel } = useI18n();
  return (
    <li id={`list-${work.id}`}>
      <button
        type="button"
        onClick={() => onSelect(work.id)}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-center gap-3 rounded-item border p-2 text-left transition-[opacity,background-color,border-color] duration-200 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none",
          selected ? "border-white/40 bg-white/10" : "border-transparent bg-card/60 hover:bg-card",
          dimmed && "opacity-35",
        )}
      >
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
        {distance !== undefined && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
              distance < 0
                ? "border-amber-400/40 text-amber-200"
                : "border-sky-400/40 text-sky-200",
            )}
          >
            {distance < 0 ? t.listBefore : t.listAfter}
          </span>
        )}
      </button>
    </li>
  );
}
