import { ChartColumnBig, ChevronRight, Signpost } from "lucide-react";
import * as m from "motion/react-m";

import { ROUTES } from "@/data/routes";
import { FRANCHISE_META } from "@/data/works";
import { WORK_GRAPHS } from "@/lib/graph/relations";
import { routeWorks } from "@/lib/graph/watch-order";
import { useI18n } from "@/lib/i18n";
import type { Progress, Tally } from "@/lib/progress";
import { totalRuntime } from "@/lib/runtime";
import { clearWatched, useWatched } from "@/lib/watched";

const ITEM = {
  hidden: { opacity: 0, y: 6 },
  shown: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 24 } },
} as const;

export function ProgressHeader() {
  const { t } = useI18n();
  return (
    <m.div
      variants={{ shown: { transition: { staggerChildren: 0.06 } } }}
      initial="hidden"
      animate="shown"
      className="flex items-start gap-3 sm:gap-4"
    >
      <m.span
        variants={ITEM}
        className="flex size-11 shrink-0 items-center justify-center rounded-item bg-marquee/15 text-marquee ring-1 ring-marquee/30"
      >
        <ChartColumnBig className="size-5" aria-hidden />
      </m.span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-10">
        <m.span
          variants={ITEM}
          data-slot="detail-title"
          className="block text-base/snug font-semibold sm:text-lg"
        >
          {t.progress}
        </m.span>
        <m.span variants={ITEM} className="text-xs text-muted-foreground">
          {t.progressNote}
        </m.span>
      </span>
    </m.div>
  );
}

const percent = ({ watched, total }: Tally) =>
  total > 0 ? Math.round((watched / total) * 100) : 0;

// A headline number with its label underneath.
function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-item bg-tint/5 px-3 py-2.5">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className="text-base font-semibold whitespace-nowrap tabular-nums sm:text-2xl">
        {value}
      </span>
      {detail && <span className="text-xs text-muted-foreground tabular-nums">{detail}</span>}
    </div>
  );
}

// One named ratio: a name, a bar, and the figure. The bar's track is a light
// step of its fill, so the whole length reads as the whole.
function MeterRow({ name, tally, dot }: { name: string; tally: Tally; dot?: string }) {
  const { t } = useI18n();
  return (
    <li className="grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-x-3 text-xs sm:grid-cols-[minmax(0,10rem)_1fr_auto]">
      <span className="flex min-w-0 items-center gap-1.5">
        {dot && <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden />}
        <span className="truncate">{name}</span>
      </span>
      {/* The figure beside it says the same for screen readers. */}
      <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-marquee/15">
        <span
          className="block h-full rounded-full bg-marquee transition-[width] duration-500"
          style={{ width: `${percent(tally)}%` }}
        />
      </span>
      <span className="text-right text-muted-foreground tabular-nums">
        {t.worksOf(tally.watched, tally.total)}
      </span>
    </li>
  );
}

function MeterList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-foreground/80">{title}</h3>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}

// The headline numbers: how much of what's out is watched.
export function ProgressStats({ progress }: { progress: Progress }) {
  const { t } = useI18n();
  const { works, minutes } = progress;
  return (
    <div className="flex flex-col gap-2 px-2 pt-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t.statWatched} value={t.worksOf(works.watched, works.total)} />
        <Stat label={t.statTime} value={t.duration(minutes.watched)} />
        <Stat label={t.statShare} value={`${percent(works)}%`} />
      </div>
      {works.watched === 0 && <p className="text-xs text-muted-foreground">{t.nothingWatched}</p>}
    </div>
  );
}

// The breakdown: the MCU phase by phase, and every franchise.
export function ProgressBreakdown({ progress }: { progress: Progress }) {
  const { t, franchiseLabel } = useI18n();
  return (
    <div className="grid gap-4 px-2 pt-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-1 lg:gap-4">
      <MeterList title={t.byPhase}>
        {progress.phases.map((p) => (
          <MeterRow key={p.phase} name={t.phase(p.phase)} tally={p} />
        ))}
      </MeterList>
      <MeterList title={t.byFranchise}>
        {progress.franchises.map((f) => (
          <MeterRow
            key={f.franchise}
            name={franchiseLabel(f.franchise)}
            tally={f}
            dot={FRANCHISE_META[f.franchise].colorClass}
          />
        ))}
      </MeterList>
    </div>
  );
}

// Short themed paths, for watching one storyline rather than everything.
// Picking one moves the card to it; ‹ comes back here.
export function RouteList({ onPick }: { onPick: (id: string) => void }) {
  const { t, locale } = useI18n();
  const ja = locale === "ja";
  return (
    <section className="flex flex-col gap-1.5 px-2 pt-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
          <Signpost className="size-3.5 text-marquee" aria-hidden />
          {t.routes}
        </h3>
        <p className="text-xs text-muted-foreground">{t.routesIntro}</p>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
        {ROUTES.map((route) => {
          // Routes span every kind of work, whatever the map's filters.
          const works = routeWorks(route, WORK_GRAPHS.all);
          const { minutes } = totalRuntime(works);
          return (
            <li key={route.id}>
              <button
                type="button"
                onClick={() => onPick(route.id)}
                className="flex size-full items-center gap-2 rounded-item bg-tint/5 p-2.5 text-left transition-colors hover:bg-tint/9 focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {ja ? route.titleJa : route.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                    {t.routeCount(works.length)}
                    {minutes > 0 && ` · ${t.duration(minutes)}`}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Forgets every watched mark, after a confirm. Only there once something is.
export function ClearWatched() {
  const { t } = useI18n();
  const watched = useWatched();
  if (watched.size === 0) return null;
  return (
    <div className="flex justify-end px-2 pt-3 pb-1">
      <button
        type="button"
        onClick={() => {
          if (window.confirm(t.clearWatchedConfirm(watched.size))) clearWatched();
        }}
        className="rounded-full px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-tint/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none"
      >
        {t.clearWatched}
      </button>
    </div>
  );
}
