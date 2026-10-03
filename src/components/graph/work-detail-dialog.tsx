import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EARTH_META, earthsOf, FRANCHISE_META, posterUrl, type WorkNode } from "@/data/works";
import type { WorkGraph } from "@/lib/graph/relations";
import { watchFirst } from "@/lib/graph/watch-order";
import { useI18n } from "@/lib/i18n";

import { MediumBadge } from "./medium-badge";

interface Props {
  work: WorkNode;
  graph: WorkGraph;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Picking a work from the list selects it on the map.
  onSelect: (id: string) => void;
}

// The selected work in full, with everything to watch before it in order.
// Opened by tapping the compact detail panel, which stays as it is.
export function WorkDetailDialog({ work, graph, open, onOpenChange, onSelect }: Props) {
  const { t, titleOf, franchiseLabel, earthLabel } = useI18n();
  const steps = watchFirst(work.id, graph);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The work's header stays put; only the watch-first list scrolls. */}
      <DialogContent closeLabel={t.close} className="flex max-w-xl flex-col overflow-hidden">
        <div className="flex shrink-0 items-start gap-4 pr-6">
          <img
            src={posterUrl(work)}
            alt=""
            className="h-36 w-24 shrink-0 rounded-thumb bg-muted object-cover"
            onError={(event) => (event.currentTarget.style.visibility = "hidden")}
          />
          <div className="min-w-0">
            <DialogTitle>{titleOf(work)}</DialogTitle>
            <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
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
            </DialogDescription>
          </div>
        </div>

        <section className="mt-5 flex min-h-0 flex-1 flex-col">
          <h3 className="flex shrink-0 items-baseline justify-between text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t.watchFirst}
            {steps.length > 0 && (
              <span className="font-normal tracking-normal normal-case">
                {t.watchFirstCount(steps.length)}
              </span>
            )}
          </h3>
          {steps.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t.nothingFirst}</p>
          ) : (
            <ol className="-mx-2 mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto px-2">
              {steps.map(({ work: step, direct }, i) => (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(step.id)}
                    className="flex w-full items-center gap-3 rounded-item px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <img
                      src={posterUrl(step)}
                      alt=""
                      loading="lazy"
                      className="h-12 w-8 shrink-0 rounded-thumb bg-muted object-cover"
                      onError={(event) => (event.currentTarget.style.visibility = "hidden")}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{titleOf(step)}</span>
                      <span className="text-xs text-muted-foreground">
                        {step.releaseDate.slice(0, 4)}
                      </span>
                    </span>
                    {direct && (
                      <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {t.directTag}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
