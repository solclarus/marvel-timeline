import { ChevronRight, Signpost } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ROUTES } from "@/data/routes";
import { WORK_GRAPHS } from "@/lib/graph/relations";
import { routeWorks } from "@/lib/graph/watch-order";
import { useI18n } from "@/lib/i18n";
import { totalRuntime } from "@/lib/runtime";

// Themed paths (one storyline each). Picking one shows it as the list,
// narrowed to its works in watch order. Opened from the command bar.
export function RoutesDialog({ onSelect }: { onSelect: (id: string) => void }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const ja = locale === "ja";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label={t.routes} />}>
        <Signpost className="size-4" />
      </DialogTrigger>
      <DialogContent closeLabel={t.close} className="flex max-w-xl flex-col overflow-hidden">
        <DialogTitle className="pr-6">{t.routes}</DialogTitle>
        <DialogDescription className="mt-1">{t.routesIntro}</DialogDescription>
        <ul className="-mx-2 mt-4 min-h-0 space-y-1 overflow-y-auto px-2">
          {ROUTES.map((route) => {
            // Routes span every kind of work, whatever the map's filters.
            const works = routeWorks(route, WORK_GRAPHS.all);
            const { minutes } = totalRuntime(works);
            return (
              <li key={route.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSelect(route.id);
                  }}
                  className="flex w-full items-center gap-3 rounded-item border border-white/10 bg-white/[0.05] p-3 text-left hover:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{ja ? route.titleJa : route.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {ja ? route.summaryJa : route.summary}
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
      </DialogContent>
    </Dialog>
  );
}
