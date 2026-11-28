import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Clock,
  Earth,
  Layers,
  Library,
  ListOrdered,
  Shapes,
  Signpost,
  X,
} from "lucide-react";
import { AnimatePresence, type Variants } from "motion/react";
import * as m from "motion/react-m";

import { ROUTES } from "@/data/routes";
import {
  EARTH_META,
  earthsOf,
  FRANCHISE_META,
  isUpcoming,
  mediumOf,
  posterUrl,
  type WorkNode,
} from "@/data/works";
import { WORK_BY_ID, WORK_GRAPHS, type WorkGraph } from "@/lib/graph/relations";
import { routeWorks, watchFirst } from "@/lib/graph/watch-order";
import { useI18n } from "@/lib/i18n";
import { progressOf } from "@/lib/progress";
import { formatRelease } from "@/lib/release-date";
import { runtimeOf, totalRuntime } from "@/lib/runtime";
import { cn } from "@/lib/utils";
import { useWatched } from "@/lib/watched";

import { BulkWatched, ICON_BUTTON, ShareButton, WatchedToggle } from "./card-buttons";
import { MEDIUM_META } from "./medium-badge";
import { Poster } from "./poster";
import {
  ClearWatched,
  ProgressBreakdown,
  ProgressHeader,
  ProgressStats,
  RouteList,
} from "./progress-card";
import type { CardView } from "./use-card";
import { useFlightFromMap } from "./use-flight-from-map";
import { WorkRow } from "./work-row";

interface Props {
  view: CardView | null;
  // The card this one was opened from, for ‹.
  previous: CardView | null;
  graph: WorkGraph;
  onClose: () => void;
  onBack: () => void;
  onToggle: () => void;
  // A work picked from the card's list.
  onPick: (id: string) => void;
  // A route picked from the progress card.
  onPickRoute: (id: string) => void;
}

// Soft and a little springy, so the card floats in rather than snapping.
const FLOAT = { type: "spring", stiffness: 200, damping: 24, mass: 1 } as const;

// A card's contents settle in one after another.
const CONTENTS: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const ITEM: Variants = {
  hidden: { opacity: 0, y: 6, filter: "blur(4px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: FLOAT },
};

// The card at the top: the selected work, or a route. A work's card folds
// out what to watch first; a route's lists its works. Picking from either
// list moves the card to that work, and ‹ steps back.
export function DetailPanel({
  view,
  previous,
  graph,
  onClose,
  onBack,
  onToggle,
  onPick,
  onPickRoute,
}: Props) {
  const { t, titleOf, locale } = useI18n();
  const work = view?.kind === "work" ? WORK_BY_ID.get(view.id) : undefined;
  const route = view?.kind === "route" ? ROUTES.find((r) => r.id === view.id) : undefined;
  const ja = locale === "ja";
  const watched = useWatched();
  const progress = view?.kind === "progress" ? progressOf(watched) : null;
  const labelOf = (card: CardView) => {
    if (card.kind === "work") return titleOf(WORK_BY_ID.get(card.id)!);
    if (card.kind === "progress") return t.progress;
    const { title, titleJa } = ROUTES.find((r) => r.id === card.id)!;
    return ja ? titleJa : title;
  };

  // What the card lists, in watch order: a work's prerequisites (when
  // folded out), a route's works, or what's up next.
  const steps = work ? watchFirst(work.id, graph) : [];
  const items = route
    ? routeWorks(route, WORK_GRAPHS.all).map((w) => ({ work: w, direct: false }))
    : progress
      ? progress.nextUp.map((w) => ({ work: w, direct: false }))
      : view?.kind === "work" && view.open
        ? steps
        : null;
  const cardKey = view ? (view.kind === "progress" ? view.kind : `${view.kind}:${view.id}`) : "";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-30 px-4 sm:top-6 md:pr-24">
      <div className="mx-auto max-w-4xl">
        {/* The card floats in and out once; moving to another work or route
            only replays its contents, so it stays in place. */}
        <AnimatePresence>
          {view && (work || route || progress) && (
            <m.div
              key="detail-panel"
              initial={{ y: -16, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: -10,
                scale: 0.97,
                filter: "blur(4px)",
                transition: { duration: 0.18, ease: "easeIn" },
              }}
              transition={FLOAT}
              className="pointer-events-auto relative flex flex-col px-4 py-3"
            >
              {/* The surface fades in out of a blur on its own, so a poster
                  flying in from the map is in full view the whole way. */}
              <m.div
                aria-hidden
                initial={{ opacity: 0, filter: "blur(8px)" }}
                animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-surface border border-tint/10 bg-card/90 shadow-2xl shadow-black/15 backdrop-blur-xl dark:shadow-black/40"
              >
                {work && <PosterWash work={work} />}
              </m.div>

              <div className="relative flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  {previous && (
                    <button
                      type="button"
                      onClick={onBack}
                      aria-label={t.backTo(labelOf(previous))}
                      className="mb-1.5 -ml-1.5 flex max-w-[calc(100%-4rem)] items-center gap-0.5 rounded-full py-0.5 pr-2 pl-1 text-xs text-muted-foreground transition-colors hover:bg-tint/10 hover:text-foreground"
                    >
                      <ChevronLeft className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{labelOf(previous)}</span>
                    </button>
                  )}
                  {work && view.kind === "work" && (
                    <WorkHeader
                      key={work.id}
                      work={work}
                      before={steps.length}
                      open={view.open}
                      onToggle={onToggle}
                    />
                  )}
                  {route && <RouteHeader key={route.id} route={route} />}
                  {progress && <ProgressHeader />}
                </div>
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="absolute top-0 right-0 z-20 flex items-center gap-0.5"
                >
                  {!progress && <ShareButton workId={work?.id} />}
                  <button
                    type="button"
                    onClick={onClose}
                    className={ICON_BUTTON}
                    aria-label={t.clearSelection}
                  >
                    <X className="size-4" />
                  </button>
                </m.div>
              </div>

              {progress && (
                <div className="relative -mx-2 max-h-[min(62dvh,36rem)] overflow-y-auto overscroll-contain">
                  <ProgressStats progress={progress} />
                  {items?.length ? (
                    <CardList
                      items={items}
                      label={t.upNext}
                      heading={t.upNext}
                      showTotal={false}
                      bulk={false}
                      onPick={onPick}
                    />
                  ) : (
                    progress.works.watched > 0 && (
                      <p className="px-2 pt-3 text-xs text-muted-foreground">{t.allCaughtUp}</p>
                    )
                  )}
                  <RouteList onPick={onPickRoute} />
                  <ProgressBreakdown progress={progress} />
                  <ClearWatched />
                </div>
              )}

              <AnimatePresence initial={false}>
                {!progress && items && items.length > 0 && (
                  <m.div
                    key={cardKey}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ ...FLOAT, opacity: { duration: 0.2 } }}
                    className="relative -mx-2 overflow-hidden"
                  >
                    <CardList
                      items={items}
                      label={work ? t.watchBefore(titleOf(work)) : labelOf(view)}
                      showTotal={!!work}
                      onPick={onPick}
                    />
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// The poster blurred to a wash of its colors, crossfading as the work changes.
function PosterWash({ work }: { work: WorkNode }) {
  return (
    <AnimatePresence initial={false}>
      <m.div
        key={work.id}
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {work.poster ? (
          <img
            src={posterUrl(work, "w154")}
            alt=""
            className="absolute top-0 left-0 h-40 w-2/3 scale-125 object-cover opacity-35 blur-2xl saturate-125 dark:opacity-50"
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
  );
}

function WorkHeader({
  work,
  before,
  open,
  onToggle,
}: {
  work: WorkNode;
  before: number;
  open: boolean;
  onToggle: () => void;
}) {
  const { t, titleOf, franchiseLabel, earthLabel, locale } = useI18n();
  const runtime = runtimeOf(work);
  const posterRef = useFlightFromMap(work.id);
  const upcoming = isUpcoming(work);
  return (
    <m.div
      variants={CONTENTS}
      initial="hidden"
      animate="shown"
      className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:gap-x-5"
    >
      <span
        ref={posterRef}
        className="relative z-10 row-span-1 block h-28 w-[4.7rem] shrink-0 overflow-hidden rounded-thumb bg-muted shadow-lg ring-1 shadow-black/20 ring-tint/15 sm:row-span-2 sm:h-44 sm:w-[7.4rem] dark:shadow-black/50"
      >
        <Poster key={work.id} work={work} loading="eager" />
      </span>
      <span className="flex min-w-0 flex-col gap-2 self-center sm:self-start sm:pt-1">
        <m.span variants={ITEM} className="block">
          <span
            data-slot="detail-title"
            className="block pr-16 text-lg/snug font-semibold text-balance sm:text-2xl/tight"
          >
            {titleOf(work)}
          </span>
          {/* The original title under the Japanese one. */}
          {locale === "ja" && work.titleJa !== work.title && (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {work.title}
            </span>
          )}
        </m.span>
      </span>
      {/* What it is, in small labels over their values. On phones it spans
          the card under the poster; wider, it sits beside it. */}
      <m.dl
        variants={ITEM}
        className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-item bg-tint/4 px-3 py-2.5 sm:col-span-1 sm:col-start-2 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-3 sm:bg-transparent sm:p-0"
      >
        <Fact icon={Shapes} label={t.factMedium}>
          {t[MEDIUM_META[mediumOf(work)].label]}
        </Fact>
        <Fact icon={Library} label={t.franchise}>
          <span
            className={`size-2 shrink-0 rounded-full ${FRANCHISE_META[work.franchise].colorClass}`}
          />
          <span className="truncate">{franchiseLabel(work.franchise)}</span>
        </Fact>
        {work.phase !== undefined && (
          <Fact icon={Layers} label={t.factPhase}>
            {t.phase(work.phase)}
          </Fact>
        )}
        <Fact icon={Earth} label={t.earth}>
          <span className="flex flex-wrap gap-x-2 gap-y-0.5">
            {earthsOf(work).map((earth) => (
              <span key={earth} className="flex items-center gap-1">
                <span className={`size-2 rounded-full ${EARTH_META[earth].colorClass}`} />
                {earthLabel(earth)}
              </span>
            ))}
          </span>
        </Fact>
        <Fact icon={CalendarDays} label={upcoming ? t.factComing : t.factReleased}>
          <span className={cn("tabular-nums", upcoming && "text-marquee")}>
            {formatRelease(work, locale)}
          </span>
        </Fact>
        {runtime && (
          <Fact icon={Clock} label={t.factRuntime}>
            <span className="tabular-nums">
              {runtime.episodes && `${t.episodes(runtime.episodes)} · `}
              {t.duration(runtime.minutes)}
            </span>
          </Fact>
        )}
      </m.dl>
      {/* What the viewer can do with it, at the card's foot. */}
      <m.div
        variants={ITEM}
        className="col-span-2 flex flex-wrap items-center gap-1.5 sm:col-span-1 sm:col-start-2"
      >
        <WatchedToggle work={work} />
        {before > 0 ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={open ? t.hideWatchFirst : t.showDetails(titleOf(work))}
            title={`${t.watchFirst} · ${t.watchFirstCount(before)}`}
            className="group inline-flex h-6 items-center gap-1 rounded-full border border-tint/10 bg-tint/5 pr-1.5 pl-2 text-xs whitespace-nowrap text-foreground/85 transition-colors hover:border-tint/20 hover:bg-tint/10 focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none aria-expanded:border-marquee/40 aria-expanded:bg-marquee/10"
          >
            <ListOrdered className="size-3.5 text-marquee" aria-hidden />
            <span className="tabular-nums">{before}</span>
            <ChevronDown
              className={cn(
                "size-3.5 text-muted-foreground transition-transform duration-300",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 py-0.5 text-xs text-muted-foreground">
            <ListOrdered className="size-3.5" aria-hidden />
            {t.startHere}
          </span>
        )}
      </m.div>
    </m.div>
  );
}

// A small label over its value.
function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Earth;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="flex min-w-0 items-center gap-1.5 text-sm">{children}</dd>
    </div>
  );
}

function RouteHeader({ route }: { route: (typeof ROUTES)[number] }) {
  const { t, locale } = useI18n();
  const ja = locale === "ja";
  const works = routeWorks(route, WORK_GRAPHS.all);
  const { minutes } = totalRuntime(works);
  return (
    <m.div
      variants={CONTENTS}
      initial="hidden"
      animate="shown"
      className="flex items-start gap-3 sm:gap-4"
    >
      <m.span
        variants={ITEM}
        className="flex size-11 shrink-0 items-center justify-center rounded-item bg-marquee/15 text-marquee ring-1 ring-marquee/30"
      >
        <Signpost className="size-5" aria-hidden />
      </m.span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-16">
        <m.span variants={ITEM} className="text-xs text-muted-foreground">
          {t.routes}
        </m.span>
        <m.span
          variants={ITEM}
          data-slot="detail-title"
          className="block text-base/snug font-semibold text-balance sm:text-lg"
        >
          {ja ? route.titleJa : route.title}
        </m.span>
        <m.span variants={ITEM} className="text-xs text-muted-foreground">
          {ja ? route.summaryJa : route.summary}
          <span className="tabular-nums">
            {" · "}
            {t.routeCount(works.length)}
            {minutes > 0 && ` · ${t.duration(minutes)}`}
          </span>
        </m.span>
      </span>
    </m.div>
  );
}

// A card's list in watch order, numbered; picking a work moves the card to it.
function CardList({
  items,
  label,
  heading,
  showTotal,
  bulk = true,
  onPick,
}: {
  items: Array<{ work: WorkNode; direct: boolean }>;
  label: string;
  heading?: string;
  showTotal: boolean;
  // Offer to mark (or unmark) the whole list.
  bulk?: boolean;
  onPick: (id: string) => void;
}) {
  const { t } = useI18n();
  const watched = useWatched();
  const works = items.map((item) => item.work);
  const { minutes, missing } = totalRuntime(works);
  const left = totalRuntime(works.filter((w) => !watched.has(w.id)));
  return (
    <div className="pt-3">
      {(heading || (showTotal && minutes > 0) || bulk) && (
        <div className="flex min-h-7 items-center justify-between gap-2 px-2 pb-1.5">
          <p className="text-xs text-muted-foreground tabular-nums">
            {heading && <span className="font-medium text-foreground/80">{heading}</span>}
            {showTotal && minutes > 0 && (
              <>
                {t.totalTime(t.duration(minutes), missing)}
                {left.minutes < minutes && ` · ${t.timeLeft(t.duration(left.minutes))}`}
              </>
            )}
          </p>
          {bulk && <BulkWatched works={works} />}
        </div>
      )}
      <ol
        aria-label={label}
        className="flex max-h-[min(52dvh,26rem)] flex-col gap-1 overflow-y-auto overscroll-contain px-2 pb-1"
      >
        {items.map(({ work }, i) => (
          <WorkRow
            key={work.id}
            id={`card-${work.id}`}
            work={work}
            number={i + 1}
            onSelect={onPick}
          />
        ))}
      </ol>
    </div>
  );
}
