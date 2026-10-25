import { ChevronDown, ChevronLeft, ListOrdered, Signpost, X } from "lucide-react";
import { AnimatePresence, type Variants } from "motion/react";
import * as m from "motion/react-m";
import { useLayoutEffect, useRef } from "react";

import { ROUTES } from "@/data/routes";
import { EARTH_META, earthsOf, FRANCHISE_META, posterUrl, type WorkNode } from "@/data/works";
import { WORK_BY_ID, WORK_GRAPHS, type WorkGraph } from "@/lib/graph/relations";
import { routeWorks, watchFirst } from "@/lib/graph/watch-order";
import { useI18n } from "@/lib/i18n";
import { motionMs } from "@/lib/motion";
import { runtimeOf, totalRuntime } from "@/lib/runtime";
import { cn } from "@/lib/utils";

import { MediumBadge } from "./medium-badge";
import { Poster } from "./poster";
import { UpcomingBadge } from "./upcoming-badge";
import type { CardView } from "./use-card";
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

// A little past the target, then back: the poster lands with a bounce.
const LANDING = "cubic-bezier(0.3, 1.25, 0.4, 1)";

// Flies the card's poster out of the selected poster on the map, so the
// card reads as opening from it. With no poster on screen to leave from
// (a search pick far away, or the list), it pops in where it is instead.
function useFlightFromMap(id: string | undefined) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const target = ref.current;
    if (!id || !target) return;
    const from = document.getElementById(id)?.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const onScreen =
      from &&
      from.width > 4 &&
      from.bottom > 0 &&
      from.right > 0 &&
      from.top < window.innerHeight &&
      from.left < window.innerWidth;
    const keyframes = onScreen
      ? [
          {
            transform: `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${
              from.top + from.height / 2 - (to.top + to.height / 2)
            }px) scale(${from.width / to.width})`,
          },
          { transform: "none" },
        ]
      : [
          { transform: "scale(0.9) rotate(-2deg)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ];
    const animation = target.animate(keyframes, {
      duration: motionMs(onScreen ? 650 : 360),
      easing: LANDING,
    });
    return () => animation.cancel();
  }, [id]);
  return ref;
}

// The card at the top: the selected work, or a route. A work's card folds
// out what to watch first; a route's lists its works. Picking from either
// list moves the card to that work, and ‹ steps back.
export function DetailPanel({ view, previous, graph, onClose, onBack, onToggle, onPick }: Props) {
  const { t, titleOf, locale } = useI18n();
  const work = view?.kind === "work" ? WORK_BY_ID.get(view.id) : undefined;
  const route = view?.kind === "route" ? ROUTES.find((r) => r.id === view.id) : undefined;
  const ja = locale === "ja";
  const labelOf = (card: CardView) => {
    if (card.kind === "work") return titleOf(WORK_BY_ID.get(card.id)!);
    const { title, titleJa } = ROUTES.find((r) => r.id === card.id)!;
    return ja ? titleJa : title;
  };

  // What the card lists, in watch order: a work's prerequisites (when
  // folded out) or a route's works.
  const steps = work ? watchFirst(work.id, graph) : [];
  const items = route
    ? routeWorks(route, WORK_GRAPHS.all).map((w) => ({ work: w, direct: false }))
    : view?.kind === "work" && view.open
      ? steps
      : null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-30 px-4 sm:top-6 md:pr-24">
      <div className="mx-auto max-w-4xl">
        {/* The card floats in and out once; moving to another work or route
            only replays its contents, so it stays in place. */}
        <AnimatePresence>
          {view && (work || route) && (
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
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-surface border border-white/10 bg-card/90 shadow-2xl shadow-black/40 backdrop-blur-xl"
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
                      className="mb-1.5 -ml-1.5 flex max-w-full items-center gap-0.5 rounded-full py-0.5 pr-2 pl-1 text-xs text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
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
                </div>
                <m.button
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  onClick={onClose}
                  className="relative shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                  aria-label={t.clearSelection}
                >
                  <X className="size-4" />
                </m.button>
              </div>

              <AnimatePresence initial={false}>
                {items && items.length > 0 && (
                  <m.div
                    key={`${view.kind}:${view.id}`}
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
            className="absolute top-0 left-0 h-40 w-2/3 scale-125 object-cover opacity-60 blur-2xl saturate-150"
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
  return (
    <m.div
      variants={CONTENTS}
      initial="hidden"
      animate="shown"
      className="flex items-start gap-3 sm:gap-4"
    >
      <span
        ref={posterRef}
        className="relative z-10 block h-20 w-14 shrink-0 overflow-hidden rounded-thumb bg-muted shadow-lg ring-1 shadow-black/50 ring-white/15 sm:h-28 sm:w-[4.7rem]"
      >
        <Poster key={work.id} work={work} loading="eager" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 sm:gap-1.5">
        <m.span
          variants={ITEM}
          className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground"
        >
          <MediumBadge work={work} />
          <span className={`size-2 rounded-full ${FRANCHISE_META[work.franchise].colorClass}`} />
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
            <span className="block truncate text-xs text-muted-foreground">{work.title}</span>
          )}
        </m.span>
        <m.span variants={ITEM} className="block">
          {before > 0 ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-label={open ? t.hideWatchFirst : t.showDetails(titleOf(work))}
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-0.5 pr-1.5 pl-2 text-xs text-foreground/85 transition-colors hover:border-white/20 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none aria-expanded:border-sky-400/40 aria-expanded:bg-sky-400/10"
            >
              <ListOrdered className="size-3.5 text-sky-300" aria-hidden />
              {t.watchFirst}
              <span className="text-muted-foreground tabular-nums">
                {t.watchFirstCount(before)}
              </span>
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
        </m.span>
      </span>
    </m.div>
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
        className="flex size-11 shrink-0 items-center justify-center rounded-item bg-sky-400/15 text-sky-300 ring-1 ring-sky-400/30"
      >
        <Signpost className="size-5" aria-hidden />
      </m.span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
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
  showTotal,
  onPick,
}: {
  items: Array<{ work: WorkNode; direct: boolean }>;
  label: string;
  showTotal: boolean;
  onPick: (id: string) => void;
}) {
  const { t } = useI18n();
  const { minutes, missing } = totalRuntime(items.map((item) => item.work));
  return (
    <div className="pt-3">
      {showTotal && minutes > 0 && (
        <p className="px-2 pb-1.5 text-xs text-muted-foreground tabular-nums">
          {t.totalTime(t.duration(minutes), missing)}
        </p>
      )}
      <ol
        aria-label={label}
        className="flex max-h-[min(52dvh,26rem)] flex-col gap-1 overflow-y-auto overscroll-contain px-2 pb-1"
      >
        {items.map(({ work, direct }, i) => (
          <WorkRow
            key={work.id}
            id={`card-${work.id}`}
            work={work}
            number={i + 1}
            tag={direct ? { label: t.directTag, tone: "before" } : undefined}
            onSelect={onPick}
          />
        ))}
      </ol>
    </div>
  );
}
