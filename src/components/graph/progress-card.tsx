import { ChartColumnBig } from "lucide-react";
import * as m from "motion/react-m";

import { FRANCHISE_META } from "@/data/works";
import { useI18n } from "@/lib/i18n";
import type { Progress, Tally } from "@/lib/progress";

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
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
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
    <div className="flex min-w-0 flex-col gap-0.5 rounded-item bg-white/5 px-3 py-2.5">
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

// The numbers: how much is watched, then the MCU phase by phase and every
// franchise.
export function ProgressBody({ progress }: { progress: Progress }) {
  const { t, franchiseLabel } = useI18n();
  const { works, minutes, phases, franchises } = progress;
  return (
    <div className="flex flex-col gap-4 px-2 pt-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t.statWatched} value={t.worksOf(works.watched, works.total)} />
        <Stat label={t.statTime} value={t.duration(minutes.watched)} />
        <Stat label={t.statShare} value={`${percent(works)}%`} />
      </div>
      {works.watched === 0 && <p className="text-xs text-muted-foreground">{t.nothingWatched}</p>}
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <MeterList title={t.byPhase}>
          {phases.map((p) => (
            <MeterRow key={p.phase} name={t.phase(p.phase)} tally={p} />
          ))}
        </MeterList>
        <MeterList title={t.byFranchise}>
          {franchises.map((f) => (
            <MeterRow
              key={f.franchise}
              name={franchiseLabel(f.franchise)}
              tally={f}
              dot={FRANCHISE_META[f.franchise].colorClass}
            />
          ))}
        </MeterList>
      </div>
    </div>
  );
}
