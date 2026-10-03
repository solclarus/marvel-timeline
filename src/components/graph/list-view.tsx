import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import type { WorkNode } from "@/data/works";
import type { Grouping } from "@/lib/graph/groups";
import type { ViewMode } from "@/lib/graph/layout";
import { listSections } from "@/lib/graph/list";
import type { WorkGraph } from "@/lib/graph/relations";
import { useI18n } from "@/lib/i18n";
import { totalRuntime } from "@/lib/runtime";
import { cn } from "@/lib/utils";

import { WorkRow, type RowTag } from "./work-row";

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
  // Narrows the list to one path (a work's watch-first list, or a route).
  focus: ListFocusView | null;
}

export interface ListFocusView {
  title: string;
  summary?: string;
  // In watch order; `direct` marks a prerequisite of the work itself.
  items: Array<{ work: WorkNode; direct?: boolean }>;
  // Shown when there's nothing to list before the work.
  empty?: string;
  onClear: () => void;
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
  focus,
}: Props) {
  const { t } = useI18n();
  const sections = listSections(mode, grouping, graph);
  // Relatives of the selection: what comes before it, and after.
  const tagFor = (distance: number | undefined): RowTag | undefined =>
    distance === undefined
      ? undefined
      : distance < 0
        ? { label: t.listBefore, tone: "before" }
        : { label: t.listAfter, tone: "after" };

  const mainRef = useRef<HTMLElement>(null);
  // A narrowed list opens at its header.
  const focusTitle = focus?.title;
  useEffect(() => {
    if (focusTitle) mainRef.current?.scrollTo({ top: 0 });
  }, [focusTitle]);

  // A selection made elsewhere (search, a route) scrolls into view; picks
  // within a narrowed list are already on screen.
  useEffect(() => {
    if (!selectedId || focusTitle) return;
    const row = document.getElementById(`list-${selectedId}`);
    const rect = row?.getBoundingClientRect();
    if (!row || !rect) return;
    // Clear of the detail panel above and the command bar below.
    if (rect.top < 140 || rect.bottom > window.innerHeight - 100) {
      row.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [selectedId, focusTitle]);

  return (
    <main
      ref={mainRef}
      className={cn(
        "h-dvh overflow-y-auto bg-neutral-800 px-3 pb-28 transition-[padding] duration-200 sm:px-6",
        selectedId ? "pt-36 sm:pt-44" : "pt-4",
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {focus ? (
          <FocusedList focus={focus} selectedId={selectedId} onSelect={onSelect} />
        ) : (
          sections.map((section) => (
            <section key={section.kind === "saga" ? section.saga : section.decade}>
              <h2 className="mb-2 flex items-baseline justify-between px-2 text-xs font-semibold tracking-wide text-muted-foreground">
                {section.kind === "saga" ? t.saga(section.saga) : t.decade(section.decade)}
                <span className="font-normal tabular-nums">
                  {t.workCount(section.works.length)}
                </span>
              </h2>
              <ol className="flex flex-col gap-1">
                {section.works.map((work) => (
                  <WorkRow
                    key={work.id}
                    id={`list-${work.id}`}
                    work={work}
                    selected={work.id === selectedId}
                    dimmed={activeSet !== null && !activeSet.has(work.id)}
                    tag={tagFor(distances.get(work.id))}
                    onSelect={onSelect}
                  />
                ))}
              </ol>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

// One path in watch order under a header with its count and running time.
function FocusedList({
  focus,
  selectedId,
  onSelect,
}: {
  focus: ListFocusView;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const works = focus.items.map((item) => item.work);
  const { minutes, missing } = totalRuntime(works);
  return (
    <section>
      <div className="mb-3 flex items-start gap-3 px-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{focus.title}</h2>
          {focus.summary && <p className="mt-0.5 text-xs text-muted-foreground">{focus.summary}</p>}
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {t.watchFirstCount(works.length)}
            {minutes > 0 && ` · ${t.totalTime(t.duration(minutes), missing)}`}
          </p>
        </div>
        <button
          type="button"
          onClick={focus.onClear}
          aria-label={t.backToFullList}
          title={t.backToFullList}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      {focus.empty && <p className="mb-3 px-2 text-sm text-muted-foreground">{focus.empty}</p>}
      <ol className="flex flex-col gap-1">
        {focus.items.map(({ work, direct }) => (
          <WorkRow
            key={work.id}
            id={`list-${work.id}`}
            work={work}
            selected={work.id === selectedId}
            tag={direct ? { label: t.directTag, tone: "before" } : undefined}
            onSelect={onSelect}
          />
        ))}
      </ol>
    </section>
  );
}
