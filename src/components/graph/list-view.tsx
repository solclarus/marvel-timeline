import { CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { isUpcoming, type WorkNode } from "@/data/works";
import type { Grouping } from "@/lib/graph/groups";
import type { ViewMode } from "@/lib/graph/layout";
import { listSections } from "@/lib/graph/list";
import type { WorkGraph } from "@/lib/graph/relations";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { setWatched } from "@/lib/watched";

import { SelectionBar } from "./selection-bar";
import { WorkRow } from "./work-row";

interface Props {
  mode: ViewMode;
  grouping: Grouping;
  graph: WorkGraph;
  selectedId: string | null;
  // Highlighted works (a selection and its relatives), or null.
  activeSet: Set<string> | null;
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
  onSelect,
  cardShown,
}: Props) {
  const { t } = useI18n();
  const sections = listSections(mode, grouping, graph);
  const ordered = sections.flatMap((section) => section.works);

  // Picking several works to mark at once. While on, a tap checks a row
  // instead of opening it, and shift-click checks the run since the last.
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const stopSelecting = () => {
    setSelecting(false);
    setPicked(new Set());
    setAnchor(null);
  };
  const pick = (id: string, event: React.MouseEvent) => {
    const next = new Set(picked);
    const on = !picked.has(id);
    const from = anchor && event.shiftKey ? ordered.findIndex((w) => w.id === anchor) : -1;
    const to = ordered.findIndex((w) => w.id === id);
    const run = from >= 0 ? ordered.slice(Math.min(from, to), Math.max(from, to) + 1) : [];
    for (const work of run.length > 0 ? run : [ordered[to]]) {
      if (isUpcoming(work)) continue;
      if (on) next.add(work.id);
      else next.delete(work.id);
    }
    setPicked(next);
    setAnchor(id);
  };
  const markPicked = (on: boolean) => {
    setWatched([...picked], on);
    setPicked(new Set());
  };

  // Escape leaves selecting before anything else hears it.
  useEffect(() => {
    if (!selecting) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      stopSelecting();
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });
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
        "h-dvh overflow-y-auto bg-canvas px-3 transition-[padding] duration-200 sm:px-6 lg:pr-28",
        // Room below the last row for the command bar (and the selection bar).
        selecting ? "pb-44 lg:pb-24" : "pb-28 lg:pb-8",
        // Under the card, or beside it where it's a sidebar.
        cardShown ? "pt-36 sm:pt-44 lg:pt-4 lg:pl-136" : "pt-4",
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="-mb-3 flex justify-end px-1">
          <button
            type="button"
            onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
            aria-pressed={selecting}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-tint/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none aria-pressed:bg-tint/10 aria-pressed:text-foreground"
          >
            <CheckCheck className="size-3.5" aria-hidden />
            {selecting ? t.selectDone : t.select}
          </button>
        </div>
        {sections.map((section) => (
          <section key={section.kind === "saga" ? section.saga : section.decade}>
            <div className="mb-2 flex items-center justify-between gap-2 px-2">
              <h2 className="flex items-baseline gap-2 text-xs font-medium text-muted-foreground">
                {section.kind === "saga" ? t.saga(section.saga) : t.decade(section.decade)}
                <span className="font-normal tabular-nums">
                  {t.workCount(section.works.length)}
                </span>
              </h2>
              {selecting && (
                <SelectAll
                  works={section.works}
                  picked={picked}
                  onChange={setPicked}
                  label={section.kind === "saga" ? t.saga(section.saga) : t.decade(section.decade)}
                />
              )}
            </div>
            <ol className="flex flex-col gap-1">
              {section.works.map((work) => (
                <WorkRow
                  key={work.id}
                  id={`list-${work.id}`}
                  work={work}
                  selected={work.id === selectedId}
                  dimmed={activeSet !== null && !activeSet.has(work.id)}
                  check={
                    selecting
                      ? { checked: picked.has(work.id), disabled: isUpcoming(work) }
                      : undefined
                  }
                  onSelect={selecting ? pick : onSelect}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>
      {selecting && (
        <SelectionBar
          count={picked.size}
          onMark={() => markPicked(true)}
          onUnmark={() => markPicked(false)}
          onDone={stopSelecting}
        />
      )}
    </main>
  );
}

// While picking: every work in a section that's out, or none of them.
function SelectAll({
  works,
  picked,
  onChange,
  label,
}: {
  works: WorkNode[];
  picked: ReadonlySet<string>;
  onChange: (picked: ReadonlySet<string>) => void;
  label: string;
}) {
  const { t } = useI18n();
  const ids = works.filter((w) => !isUpcoming(w)).map((w) => w.id);
  if (ids.length === 0) return null;
  const all = ids.every((id) => picked.has(id));
  const text = all ? t.deselectAll : t.selectAll;
  return (
    <button
      type="button"
      onClick={() => {
        const next = new Set(picked);
        for (const id of ids) {
          if (all) next.delete(id);
          else next.add(id);
        }
        onChange(next);
      }}
      aria-label={`${text}: ${label}`}
      className="shrink-0 rounded-full px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:bg-tint/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none"
    >
      {text}
    </button>
  );
}
