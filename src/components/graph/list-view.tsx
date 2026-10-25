import { useEffect } from "react";

import type { Grouping } from "@/lib/graph/groups";
import type { ViewMode } from "@/lib/graph/layout";
import { listSections } from "@/lib/graph/list";
import type { WorkGraph } from "@/lib/graph/relations";
import { useI18n } from "@/lib/i18n";
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
  // The card is showing over the list's top (a work or a route).
  cardShown: boolean;
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
  cardShown,
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

  // A selection made elsewhere (search, the card's list) scrolls into view.
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
        cardShown ? "pt-36 sm:pt-44" : "pt-4",
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
        ))}
      </div>
    </main>
  );
}
