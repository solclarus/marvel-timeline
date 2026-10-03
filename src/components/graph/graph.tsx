import { useEffect, useRef, useState } from "react";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import { WORKS } from "@/data/works";
import {
  groupKeyOf,
  isWorkVisible,
  PHASE_GROUP,
  regroup,
  type GroupBy,
  type Grouping,
} from "@/lib/graph/groups";
import {
  canvasSize,
  computeEdgeGeometry,
  computeEraBands,
  computeGroupCards,
  groupCardAt,
  computeLayout,
  computePhaseBands,
  type Axis,
  type ViewMode,
} from "@/lib/graph/layout";
import {
  computeEdgeVisibility,
  getRelatedDistances,
  WORK_BY_ID,
  WORK_GRAPHS,
  type FocusMode,
  type MediaFilter,
} from "@/lib/graph/relations";
import {
  clampPan,
  fitBox,
  isZoomGesture,
  wheelPanDelta,
  wheelZoomFactor,
  zoomAround,
  type TransformState,
} from "@/lib/graph/wheel-zoom";
import { parseUrlState, serializeUrlState } from "@/lib/url-state";

import { CommandBar } from "./command-bar";
import { DetailPanel } from "./detail-panel";
import { GraphEdges } from "./graph-edges";
import {
  GraphNode,
  HEIGHT as NODE_HEIGHT,
  PosterTooltip,
  WIDTH as NODE_WIDTH,
  type NodeState,
} from "./graph-node";
import { GroupHoverChip } from "./group-hover-chip";
import { ZoomFab } from "./zoom-fab";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.5;
const INITIAL_ZOOM = 0.6;
// Fitting a selection never zooms past 100%, so a work with few relatives
// isn't blown up.
const FIT_MAX_ZOOM = 1;
const GROUP_HOVER_DELAY_MS = 250;

const AVENGERS_ID = WORKS.find((w) => w.thread === "avengers")?.id;

// Content sizes are unscaled layout pixels; see `clampPan`.
function keepInView(ref: ReactZoomPanPinchRef, next: TransformState): TransformState {
  const { wrapperComponent: wrapper, contentComponent: content } = ref.instance;
  if (!wrapper || !content) return next;
  return clampPan(
    next,
    { width: content.offsetWidth, height: content.offsetHeight },
    { width: wrapper.clientWidth, height: wrapper.clientHeight },
  );
}

// Sits on the top-left border of a card or band, in the detail panel's
// dark colors so it reads over any tint. `dot` takes a Tailwind class
// (groups) or an inline color (phase and era bands).
// With `onToggle`, the label pins focus on its card or band: the touch
// stand-in for hovering it.
// `centered` puts it top-center, for a card or band one work wide.
function BorderLabel({
  dot,
  children,
  centered = false,
  pinned = false,
  onToggle,
}: {
  dot: { className?: string; color?: string };
  children: React.ReactNode;
  centered?: boolean;
  pinned?: boolean;
  onToggle?: () => void;
}) {
  const className = `absolute top-0 z-10 flex -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap shadow-md shadow-black/20 ${centered ? "left-1/2 -translate-x-1/2" : "left-4"} ${pinned ? "bg-card-foreground text-card" : "bg-card/95 text-card-foreground"}`;
  const content = (
    <>
      <span
        className={`size-2.5 rounded-full ${dot.className ?? ""}`}
        style={{ backgroundColor: dot.color }}
      />
      {children}
    </>
  );
  if (!onToggle) return <span className={className}>{content}</span>;
  return (
    <button
      type="button"
      // A wider hit area than the label: it's tiny when zoomed out.
      className={`${className} cursor-pointer before:absolute before:-inset-3 before:content-['']`}
      aria-pressed={pinned}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      {content}
    </button>
  );
}

export function Graph() {
  const [initial] = useState(() => parseUrlState(window.location.search));
  const [mode, setMode] = useState<ViewMode>(initial.mode);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId);
  const [focusMode, setFocusMode] = useState<FocusMode>(initial.focusMode);
  const [grouping, setGrouping] = useState<Grouping>({
    by: initial.groupBy,
    visible: initial.visibleGroups,
  });
  const [media, setMedia] = useState<MediaFilter>(initial.media);
  const graph = WORK_GRAPHS[media];
  const [zoomPercent, setZoomPercent] = useState(INITIAL_ZOOM);

  // React Compiler memoizes these, which keeps `layout` stable for the fit
  // effect's deps.
  const layout = computeLayout(mode, grouping, graph);
  const { width: canvasWidth, height: canvasHeight } = canvasSize(layout);
  const groupCards = computeGroupCards(mode, layout, grouping);
  const phaseBands = computePhaseBands(mode, layout, grouping, graph);
  const eraBands = computeEraBands(mode, layout, grouping);

  // Hovering a card or phase band (anywhere inside it, posters included)
  // focuses its works once the pointer rests, so sweeping across doesn't
  // flicker. Phase bands sit inside a card and win over it. `pending` keeps
  // where the pointer entered, for the chip.
  const [pending, setPending] = useState<{ id: string; x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => {
    if (pending === null) return;
    const timer = window.setTimeout(() => setHovered(pending.id), GROUP_HOVER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);
  // Stale once the pointer moves on; a selection wins over it.
  // Tapping a label pins focus until it's tapped again or the map is.
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const togglePinned = (id: string) => {
    setSelectedId(null);
    setPinnedId((current) => (current === id ? null : id));
  };
  const focusedId = selectedId
    ? null
    : ((hovered !== null && hovered === pending?.id ? hovered : null) ?? pinnedId);
  const focusedPhase = phaseBands.find((band) => `phase:${band.phase}` === focusedId);
  const focusedCard = groupCards.find((card) => `group:${card.key}` === focusedId);
  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
    const phase = groupCardAt(phaseBands, point);
    const card = phase ? undefined : groupCardAt(groupCards, point);
    const id = phase ? `phase:${phase.phase}` : card ? `group:${card.key}` : null;
    // Same target: keep the state as is, so moving within it doesn't re-render.
    setPending((current) =>
      (current?.id ?? null) === id
        ? current
        : id === null
          ? null
          : { id, x: event.clientX, y: event.clientY },
    );
  };

  const distances = selectedId
    ? getRelatedDistances(selectedId, focusMode, graph)
    : new Map<string, number>();
  const activeSet = selectedId
    ? new Set([selectedId, ...distances.keys()])
    : focusedPhase
      ? new Set(
          graph.works
            .filter(
              (w) =>
                w.phase === focusedPhase.phase &&
                groupKeyOf(w, grouping.by) === PHASE_GROUP[grouping.by],
            )
            .map((w) => w.id),
        )
      : focusedCard
        ? new Set(
            graph.works
              .filter((w) => groupKeyOf(w, grouping.by) === focusedCard.key)
              .map((w) => w.id),
          )
        : null;

  const nodeState = (id: string): NodeState =>
    !activeSet
      ? "neutral"
      : id === selectedId
        ? "selected"
        : activeSet.has(id)
          ? "ancestor"
          : "dimmed";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // replaceState, not pushState: Back should leave the app, not step through
  // every click.
  useEffect(() => {
    const search = serializeUrlState({
      mode,
      selectedId,
      focusMode,
      groupBy: grouping.by,
      visibleGroups: grouping.visible,
      media,
    });
    const { pathname, hash } = window.location;
    window.history.replaceState(window.history.state, "", `${pathname}${search}${hash}`);
  }, [mode, selectedId, focusMode, grouping, media]);

  const handleSelect = (id: string) => {
    setSelectedId((current) => (current === id ? null : id));
  };

  const handleToggleGroup = (key: string) => {
    setGrouping((current) => {
      if (current.visible.has(key) && current.visible.size === 1) return current;
      const visible = new Set(current.visible);
      if (visible.has(key)) visible.delete(key);
      else visible.add(key);
      return { ...current, visible };
    });
  };

  const handleGroupByChange = (by: GroupBy) => {
    setGrouping((current) => regroup(current, by, WORKS));
  };

  const handleMediaChange = (next: MediaFilter) => {
    setMedia(next);
    // A selected series isn't on the films-only map.
    if (next === "movies" && selectedId && WORK_BY_ID.get(selectedId)?.tmdb.type !== "movie") {
      setSelectedId(null);
    }
  };

  // A search pick may be filtered out: show its media and group, then select
  // it (which fits the view to it).
  const handleSearchSelect = (id: string) => {
    const work = WORK_BY_ID.get(id);
    if (!work) return;
    if (work.tmdb.type !== "movie") setMedia("all");
    const key = groupKeyOf(work, grouping.by);
    if (!grouping.visible.has(key)) {
      setGrouping((current) => ({ ...current, visible: new Set([...current.visible, key]) }));
    }
    setSelectedId(id);
  };

  const visibleWorks = graph.works.filter((w) => isWorkVisible(w, grouping));
  const visibleIds = new Set(visibleWorks.map((w) => w.id));
  const edgeVisibility = computeEdgeVisibility(visibleIds, activeSet, graph);

  const axis: Axis = mode === "recommended" ? "y" : "x";
  const geometry = computeEdgeGeometry(
    axis === "y" ? canvasHeight : canvasWidth,
    axis === "y" ? layout.rowCount : layout.totalLanes,
    axis === "y" ? layout.totalLanes : layout.rowCount,
    axis === "y" ? NODE_HEIGHT : NODE_WIDTH,
  );

  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  // Selecting a work zooms the map so it and its relatives fit in the area
  // the bars and detail panel leave uncovered, and refits when what's shown
  // changes. Only then: the map re-renders on every zoom, and refitting on
  // those would undo the viewer's own zooming. The first fit (a shared
  // link) jumps; later ones animate.
  const fitKey = selectedId
    ? [
        selectedId,
        focusMode,
        media,
        mode,
        grouping.by,
        [...grouping.visible].sort().join(","),
      ].join("|")
    : null;
  const lastFitKeyRef = useRef<string | null>(null);
  const hasFittedRef = useRef(false);
  useEffect(() => {
    if (fitKey === lastFitKeyRef.current) return;
    lastFitKeyRef.current = fitKey;
    if (!selectedId) return;
    const ids = [selectedId, ...getRelatedDistances(selectedId, focusMode, graph).keys()];
    const points = ids.map((id) => layout.positions.get(id)).filter((pos) => pos !== undefined);
    if (points.length === 0) return;
    const pad = 24;
    const xs = points.map((pos) => (pos.x / 100) * canvasWidth);
    const ys = points.map((pos) => (pos.y / 100) * canvasHeight);
    const box = {
      left: Math.min(...xs) - NODE_WIDTH / 2 - pad,
      right: Math.max(...xs) + NODE_WIDTH / 2 + pad,
      top: Math.min(...ys) - NODE_HEIGHT / 2 - pad,
      bottom: Math.max(...ys) + NODE_HEIGHT / 2 + pad,
    };
    const animationTime = hasFittedRef.current ? 450 : 0;
    hasFittedRef.current = true;

    // Two frames, so the library's ResizeObserver (which cancels in-flight
    // animations on resize) has already fired.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const wrapper = transformRef.current?.instance.wrapperComponent;
        if (!wrapper) return;
        const viewport = { width: wrapper.clientWidth, height: wrapper.clientHeight };
        const phone = viewport.width < 640;
        const next = fitBox(
          box,
          viewport,
          {
            top: 88,
            bottom: phone ? 170 : 150,
            left: 24,
            right: viewport.width >= 768 ? 96 : 24,
          },
          MIN_ZOOM,
          FIT_MAX_ZOOM,
        );
        transformRef.current?.setTransform(next.x, next.y, next.scale, animationTime);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [fitKey, selectedId, focusMode, graph, layout, canvasWidth, canvasHeight]);

  return (
    <TransformWrapper
      minScale={MIN_ZOOM}
      maxScale={MAX_ZOOM}
      initialScale={INITIAL_ZOOM}
      limitToBounds={false}
      centerOnInit={false}
      doubleClick={{ step: 0.6, mode: "zoomIn" }}
      // Desktop wheel and trackpad input is handled below; see wheel-zoom.ts.
      wheel={{ disabled: true }}
      pinch={{ step: 5 }}
      onTransform={(_ref, state) => setZoomPercent(state.scale)}
      // Dragging may overshoot; it eases back once released.
      onPanningStop={(ref) => {
        const { positionX: x, positionY: y, scale } = ref.instance.state;
        const next = keepInView(ref, { x, y, scale });
        if (next.x !== x || next.y !== y) ref.setTransform(next.x, next.y, scale, 200);
      }}
      onInit={(ref) => {
        transformRef.current = ref;
        // The wrapper is still natively scrollable (e.g. focus scroll-into-view),
        // which would skew every transform calculation.
        const wrapper = ref.instance.wrapperComponent;
        wrapper?.addEventListener("scroll", () => {
          wrapper.scrollTop = 0;
          wrapper.scrollLeft = 0;
        });
        wrapper?.addEventListener(
          "wheel",
          (event) => {
            event.preventDefault();
            const { positionX, positionY, scale } = ref.instance.state;
            if (!isZoomGesture(event)) {
              const pan = wheelPanDelta(event);
              const next = keepInView(ref, {
                x: positionX + pan.x,
                y: positionY + pan.y,
                scale,
              });
              ref.setTransform(next.x, next.y, scale, 0);
              return;
            }
            const rect = wrapper.getBoundingClientRect();
            const next = keepInView(
              ref,
              zoomAround(
                { x: positionX, y: positionY, scale },
                wheelZoomFactor(event),
                { x: event.clientX - rect.left, y: event.clientY - rect.top },
                MIN_ZOOM,
                MAX_ZOOM,
              ),
            );
            ref.setTransform(next.x, next.y, next.scale, 0);
          },
          { passive: false },
        );
        // A linked work is fitted by the selection effect; otherwise start at
        // the Avengers.
        if (initial.selectedId) return;
        if (AVENGERS_ID && document.getElementById(AVENGERS_ID)) {
          ref.zoomToElement(AVENGERS_ID, { scale: INITIAL_ZOOM }, 0);
        } else {
          ref.fitToView({ animationTime: 0 });
        }
      }}
    >
      {(utils) => (
        <div>
          <TransformComponent
            // `!`: the library's fit-content wrapper sizing breaks its viewport math.
            wrapperClass="!block !h-screen !w-full bg-stone-200 shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
            contentClass="!items-start"
          >
            <div
              key="main"
              className="relative"
              style={{ width: canvasWidth, height: canvasHeight }}
              role="presentation"
              onClick={() => {
                setSelectedId(null);
                setPinnedId(null);
              }}
              onPointerMove={handleCanvasPointerMove}
              onPointerLeave={() => setPending(null)}
            >
              {groupCards.map(
                ({ key, label, colorClass, cardClass, top, height, left, width, singleColumn }) => (
                  <div
                    key={key}
                    className={`absolute rounded-2xl border-2 border-dashed transition-colors ${key === focusedCard?.key ? "bg-white/70" : "bg-white/35"} ${cardClass}`}
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                  >
                    <BorderLabel
                      dot={{ className: colorClass }}
                      centered={singleColumn}
                      pinned={pinnedId === `group:${key}`}
                      onToggle={() => togglePinned(`group:${key}`)}
                    >
                      {label}
                    </BorderLabel>
                  </div>
                ),
              )}
              {phaseBands.map(
                ({ phase, top, height, left, width, color, borderColor, singleColumn }) => (
                  <div
                    key={phase}
                    className="absolute rounded-2xl border-2"
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: color,
                      borderColor,
                    }}
                  >
                    <BorderLabel
                      dot={{ color: borderColor }}
                      centered={singleColumn}
                      pinned={pinnedId === `phase:${phase}`}
                      onToggle={() => togglePinned(`phase:${phase}`)}
                    >
                      Phase {phase}
                    </BorderLabel>
                  </div>
                ),
              )}
              {eraBands.map(({ key, label, left, width, color, borderColor }) => (
                <div
                  key={key}
                  className="absolute inset-y-0 border-r border-dashed last:border-r-0"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: color,
                    borderColor,
                  }}
                >
                  <BorderLabel dot={{ color: borderColor }}>{label}</BorderLabel>
                </div>
              ))}
              <GraphEdges
                edges={graph.edges}
                positions={layout.positions}
                activeSet={activeSet}
                distances={distances}
                visibleIds={visibleIds}
                axis={axis}
                {...geometry}
              />
              {visibleWorks.map((work) => {
                const pos = layout.positions.get(work.id)!;
                return (
                  <GraphNode
                    key={work.id}
                    work={work}
                    x={pos.x}
                    y={pos.y}
                    state={nodeState(work.id)}
                    delay={
                      activeSet?.has(work.id) ? Math.abs(distances.get(work.id) ?? 0) * 0.06 : 0
                    }
                    onSelect={handleSelect}
                    axis={axis}
                    hasIncoming={edgeVisibility.hasIncoming.has(work.id)}
                    hasOutgoing={edgeVisibility.hasOutgoing.has(work.id)}
                  />
                );
              })}
            </div>
          </TransformComponent>

          <PosterTooltip />
          {/* Only for hover focus; a pinned label already names its group. */}
          {(focusedPhase || focusedCard) && pending?.id === focusedId && (
            <GroupHoverChip
              key={pending.id}
              label={focusedPhase ? `Phase ${focusedPhase.phase}` : focusedCard!.label}
              dot={
                focusedPhase
                  ? { color: focusedPhase.borderColor }
                  : { className: focusedCard!.colorClass }
              }
              count={activeSet?.size ?? 0}
              initial={pending}
            />
          )}

          <DetailPanel selectedId={selectedId} onClear={() => setSelectedId(null)} />

          <CommandBar
            onSearchSelect={handleSearchSelect}
            mode={mode}
            onModeChange={setMode}
            media={media}
            onMediaChange={handleMediaChange}
            grouping={grouping}
            onToggleGroup={handleToggleGroup}
            onGroupByChange={handleGroupByChange}
            focusMode={focusMode}
            onFocusModeChange={setFocusMode}
          />
          <ZoomFab
            zoom={zoomPercent}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onZoomIn={() => utils.zoomIn(0.25)}
            onZoomOut={() => utils.zoomOut(0.25)}
            onFit={() => utils.fitToView()}
          />
        </div>
      )}
    </TransformWrapper>
  );
}
