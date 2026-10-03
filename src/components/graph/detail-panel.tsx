import { Check, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";

import { Button } from "@/components/ui/button";
import { EARTH_META, earthsOf, FRANCHISE_META, posterUrl } from "@/data/works";
import { WORK_BY_ID } from "@/lib/graph/relations";

interface Props {
  selectedId: string | null;
  onClear: () => void;
  watched: Set<string>;
  onToggleWatched: (id: string) => void;
}

export function DetailPanel({ selectedId, onClear, watched, onToggleWatched }: Props) {
  const work = selectedId ? WORK_BY_ID.get(selectedId) : undefined;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 px-4">
      <div className="mx-auto max-w-4xl">
        <AnimatePresence>
          {work && (
            <m.div
              key={work.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-start gap-3 rounded-lg border bg-card/95 px-4 py-3 shadow-xl shadow-black/30 backdrop-blur-md"
            >
              <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-sm bg-muted">
                <img src={posterUrl(work)} alt="" className="size-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  <span
                    className={`size-2 rounded-full ${FRANCHISE_META[work.franchise].colorClass}`}
                  />
                  {FRANCHISE_META[work.franchise].label}
                  <span aria-hidden>·</span>
                  {earthsOf(work).map((earth, i) => (
                    <span key={earth} className="flex items-center gap-1">
                      {i > 0 && <span aria-hidden>/ </span>}
                      <span className={`size-2 rounded-full ${EARTH_META[earth].colorClass}`} />
                      {EARTH_META[earth].label}
                    </span>
                  ))}
                  <span aria-hidden>·</span>
                  {work.releaseDate.slice(0, 4)}
                </p>
                <p className="font-semibold">{work.title}</p>
                <Button
                  variant={watched.has(work.id) ? "default" : "outline"}
                  size="sm"
                  className="mt-2 rounded-full"
                  onClick={() => onToggleWatched(work.id)}
                  aria-pressed={watched.has(work.id)}
                >
                  <Check />
                  {watched.has(work.id) ? "Watched" : "Mark as watched"}
                </Button>
              </div>
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear selection"
              >
                <X className="size-4" />
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
