import { X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useState } from "react";

import { EARTH_META, earthsOf, FRANCHISE_META, posterUrl } from "@/data/works";
import { WORK_BY_ID, type WorkGraph } from "@/lib/graph/relations";
import { useI18n } from "@/lib/i18n";

import { MediumBadge } from "./medium-badge";
import { WorkDetailDialog } from "./work-detail-dialog";

interface Props {
  selectedId: string | null;
  onClear: () => void;
  onSelect: (id: string) => void;
  graph: WorkGraph;
}

// The compact card for the selection; tapping it opens the full detail
// dialog with what to watch first.
export function DetailPanel({ selectedId, onClear, onSelect, graph }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const { t, titleOf, franchiseLabel, earthLabel } = useI18n();
  const work = selectedId ? WORK_BY_ID.get(selectedId) : undefined;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-30 px-4 sm:top-6 md:pr-24">
      <div className="mx-auto max-w-4xl">
        {/* The panel itself slides in and out once; switching works only fades
            its contents, so picking another work doesn't replay the entrance. */}
        <AnimatePresence>
          {work && (
            <m.div
              key="detail-panel"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-start gap-3 rounded-surface border bg-card/95 px-4 py-3 shadow-xl shadow-black/30 backdrop-blur-md"
            >
              <m.button
                type="button"
                key={work.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                onClick={() => setDetailOpen(true)}
                aria-label={t.showDetails(titleOf(work))}
                className="-m-1 flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-item p-1 text-left hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
              >
                <span className="relative block h-16 w-11 shrink-0 overflow-hidden rounded-thumb bg-muted sm:h-24 sm:w-16">
                  <img
                    src={posterUrl(work)}
                    alt=""
                    className="size-full object-cover"
                    // A failed poster leaves the muted box rather than a broken icon.
                    onError={(event) => (event.currentTarget.style.visibility = "hidden")}
                  />
                </span>
                <span className="block min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                    <MediumBadge work={work} />
                    <span
                      className={`size-2 rounded-full ${FRANCHISE_META[work.franchise].colorClass}`}
                    />
                    {franchiseLabel(work.franchise)}
                    <span aria-hidden>·</span>
                    {earthsOf(work).map((earth, i) => (
                      <span key={earth} className="flex items-center gap-1">
                        {i > 0 && <span aria-hidden>/ </span>}
                        <span className={`size-2 rounded-full ${EARTH_META[earth].colorClass}`} />
                        {earthLabel(earth)}
                      </span>
                    ))}
                    <span aria-hidden>·</span>
                    {work.releaseDate.slice(0, 4)}
                  </span>
                  <span data-slot="detail-title" className="block font-semibold">
                    {titleOf(work)}
                  </span>
                </span>
              </m.button>
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t.clearSelection}
              >
                <X className="size-4" />
              </button>
            </m.div>
          )}
        </AnimatePresence>
        {work && (
          <WorkDetailDialog
            work={work}
            graph={graph}
            open={detailOpen}
            onOpenChange={setDetailOpen}
            onSelect={(id) => {
              setDetailOpen(false);
              onSelect(id);
            }}
          />
        )}
      </div>
    </div>
  );
}
