import { ChevronLeft, ChevronRight, Signpost } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ROUTES, type Route } from "@/data/routes";
import { WORK_GRAPHS } from "@/lib/graph/relations";
import { routeWorks } from "@/lib/graph/watch-order";
import { useI18n } from "@/lib/i18n";
import { totalRuntime } from "@/lib/runtime";

import { ListTotals, WatchList } from "./watch-list";

// Routes span every kind of work whatever the map's filters; picking a work
// reveals it on the map.
const routeList = (route: Route) => routeWorks(route, WORK_GRAPHS.all);

// Themed paths (one storyline each) in watch order: a list of routes, then
// one route's works. Opened from the command bar.
export function RoutesDialog({ onSelect }: { onSelect: (id: string) => void }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [routeId, setRouteId] = useState<string | null>(null);
  const route = ROUTES.find((r) => r.id === routeId);
  const ja = locale === "ja";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setRouteId(null);
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label={t.routes} />}>
        <Signpost className="size-4" />
      </DialogTrigger>
      <DialogContent closeLabel={t.close} className="flex max-w-xl flex-col overflow-hidden">
        {route ? (
          <>
            <button
              type="button"
              onClick={() => setRouteId(null)}
              className="-ml-1 flex w-fit items-center gap-0.5 rounded-full py-0.5 pr-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
              {t.backToRoutes}
            </button>
            <DialogTitle className="mt-2 pr-6">{ja ? route.titleJa : route.title}</DialogTitle>
            <DialogDescription className="mt-1">
              {ja ? route.summaryJa : route.summary}
            </DialogDescription>
            <section className="mt-4 flex min-h-0 flex-1 flex-col">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <ListTotals
                  works={routeList(route)}
                  label={t.watchFirstCount(routeList(route).length)}
                />
              </h3>
              <WatchList
                items={routeList(route).map((work) => ({ work }))}
                onSelect={(id) => {
                  setOpen(false);
                  setRouteId(null);
                  onSelect(id);
                }}
              />
            </section>
          </>
        ) : (
          <>
            <DialogTitle className="pr-6">{t.routes}</DialogTitle>
            <DialogDescription className="mt-1">{t.routesIntro}</DialogDescription>
            <ul className="-mx-2 mt-4 min-h-0 space-y-1 overflow-y-auto px-2">
              {ROUTES.map((r) => {
                const works = routeList(r);
                const { minutes } = totalRuntime(works);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setRouteId(r.id)}
                      className="flex w-full items-center gap-3 rounded-item border border-white/10 p-3 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{ja ? r.titleJa : r.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {ja ? r.summaryJa : r.summary}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground tabular-nums">
                          {t.routeCount(works.length)}
                          {minutes > 0 && ` · ${t.duration(minutes)}`}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
