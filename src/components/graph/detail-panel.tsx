import { ChevronRight, ListOrdered, X } from "lucide-react";
import { AnimatePresence, type Variants } from "motion/react";
import * as m from "motion/react-m";

import { EARTH_META, earthsOf, FRANCHISE_META, posterUrl } from "@/data/works";
import { WORK_BY_ID, type WorkGraph } from "@/lib/graph/relations";
import { watchFirst } from "@/lib/graph/watch-order";
import { useI18n } from "@/lib/i18n";
import { runtimeOf } from "@/lib/runtime";
import { cn } from "@/lib/utils";

import { MediumBadge } from "./medium-badge";
import { Poster } from "./poster";
import { UpcomingBadge } from "./upcoming-badge";

interface Props {
  selectedId: string | null;
  graph: WorkGraph;
  onClear: () => void;
  // Shows what to watch before the work (the list, narrowed to its path).
  onOpen: () => void;
}

// Soft and a little springy, so the card floats in rather than snapping.
const FLOAT = { type: "spring", stiffness: 200, damping: 24, mass: 1 } as const;

// A work's contents settle in one after another: poster, details, title,
// then the watch-first hint.
const CONTENTS: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const ITEM: Variants = {
  hidden: { opacity: 0, y: 6, filter: "blur(4px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: FLOAT },
};
const POSTER: Variants = {
  hidden: { opacity: 0, scale: 0.92, rotate: -2 },
  shown: { opacity: 1, scale: 1, rotate: 0, transition: FLOAT },
};

// The card for the selection, washed in its poster's colors; tapping it
// lists what to watch first.
export function DetailPanel({ selectedId, graph, onClear, onOpen }: Props) {
  const { t, titleOf, franchiseLabel, earthLabel, locale } = useI18n();
  const work = selectedId ? WORK_BY_ID.get(selectedId) : undefined;
  const runtime = work && runtimeOf(work);
  const before = work ? watchFirst(work.id, graph).length : 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-30 px-4 sm:top-6 md:pr-24">
      <div className="mx-auto max-w-4xl">
        {/* The panel itself floats in and out once; switching works only
            replays its contents, so picking another work keeps it in place. */}
        <AnimatePresence>
          {work && (
            <m.div
              key="detail-panel"
              initial={{ opacity: 0, y: -16, scale: 0.96, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{
                opacity: 0,
                y: -10,
                scale: 0.97,
                filter: "blur(4px)",
                transition: { duration: 0.18, ease: "easeIn" },
              }}
              transition={{ ...FLOAT, opacity: { duration: 0.35 }, filter: { duration: 0.4 } }}
              className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-surface border border-white/10 bg-card/90 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl"
            >
              {/* The poster, blurred to a wash of its colors; it crossfades
                  as the selection changes. */}
              <AnimatePresence initial={false}>
                <m.div
                  key={work.id}
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {work.poster ? (
                    <img
                      src={posterUrl(work, "w154")}
                      alt=""
                      className="absolute inset-y-0 left-0 h-full w-2/3 scale-125 object-cover opacity-60 blur-2xl saturate-150"
                    />
                  ) : (
                    <div
                      className={cn(
                        "absolute -top-1/2 left-0 size-64 rounded-full opacity-25 blur-3xl",
                        FRANCHISE_META[work.franchise].colorClass,
                      )}
                    />
                  )}
                  <div className="absolute inset-0 bg-linear-to-r from-card/10 via-card/50 to-card/85" />
                </m.div>
              </AnimatePresence>

              <m.button
                type="button"
                key={work.id}
                variants={CONTENTS}
                initial="hidden"
                animate="shown"
                onClick={onOpen}
                aria-label={t.showDetails(titleOf(work))}
                className="group relative -m-1 flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-item p-1 text-left focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none sm:gap-4"
              >
                <m.span
                  variants={POSTER}
                  className="relative block h-20 w-14 shrink-0 overflow-hidden rounded-thumb bg-muted shadow-lg ring-1 shadow-black/50 ring-white/15 transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-28 sm:w-[4.7rem]"
                >
                  <Poster key={work.id} work={work} loading="eager" />
                </m.span>
                <span className="flex min-w-0 flex-1 flex-col gap-1 sm:gap-1.5">
                  <m.span
                    variants={ITEM}
                    className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground"
                  >
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
                  </m.span>
                  <m.span variants={ITEM} className="block">
                    <span
                      data-slot="detail-title"
                      className="block text-base/snug font-semibold text-balance sm:text-lg"
                    >
                      {titleOf(work)}
                    </span>
                    {/* The original title under the Japanese one. */}
                    {locale === "ja" && work.titleJa !== work.title && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {work.title}
                      </span>
                    )}
                  </m.span>
                  <m.span
                    variants={ITEM}
                    className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-0.5 pr-1.5 pl-2 text-xs text-foreground/85 transition-colors group-hover:border-white/20 group-hover:bg-white/10"
                  >
                    <ListOrdered className="size-3.5 text-sky-300" aria-hidden />
                    {before > 0 ? (
                      <>
                        {t.watchFirst}
                        <span className="text-muted-foreground tabular-nums">
                          {t.watchFirstCount(before)}
                        </span>
                      </>
                    ) : (
                      t.startHere
                    )}
                    <ChevronRight
                      className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </m.span>
                </span>
              </m.button>
              <button
                type="button"
                onClick={onClear}
                className="relative shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                aria-label={t.clearSelection}
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
