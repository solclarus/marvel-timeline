import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EARTH_META, earthsOf, FRANCHISE_META, type WorkNode } from "@/data/works";
import type { WorkGraph } from "@/lib/graph/relations";
import { watchFirst } from "@/lib/graph/watch-order";
import { useI18n } from "@/lib/i18n";
import { runtimeOf } from "@/lib/runtime";

import { MediumBadge } from "./medium-badge";
import { Poster } from "./poster";
import { UpcomingBadge } from "./upcoming-badge";
import { ListTotals, WatchList } from "./watch-list";

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
  const runtime = runtimeOf(work);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The work's header stays put; only the watch-first list scrolls. */}
      <DialogContent closeLabel={t.close} className="flex max-w-xl flex-col overflow-hidden">
        <div className="flex shrink-0 items-start gap-4 pr-6">
          <span className="relative block h-36 w-24 shrink-0 overflow-hidden rounded-thumb bg-muted">
            <Poster key={work.id} work={work} />
          </span>
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
              {runtime && (
                <>
                  <span aria-hidden>·</span>
                  {runtime.episodes && `${t.episodes(runtime.episodes)} · `}
                  {t.duration(runtime.minutes)}
                </>
              )}
              <UpcomingBadge work={work} />
            </DialogDescription>
          </div>
        </div>

        <section className="mt-5 flex min-h-0 flex-1 flex-col">
          <h3 className="flex shrink-0 items-baseline justify-between text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t.watchFirst}
            {steps.length > 0 && (
              <ListTotals
                works={steps.map((step) => step.work)}
                label={t.watchFirstCount(steps.length)}
              />
            )}
          </h3>
          {steps.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t.nothingFirst}</p>
          ) : (
            <WatchList items={steps} onSelect={onSelect} />
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
