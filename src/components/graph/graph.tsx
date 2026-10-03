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
  computeFocusLayout,
  computeGroupCards,
  groupCardAt,
  computeLayout,
  computePhaseBands,
  type Axis,
  type DisplayMode,
  type Point,
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
  isZoomGesture,
  wheelPanDelta,
  wheelZoomFactor,
  zoomAround,
  type TransformState,
} from "@/lib/graph/wheel-zoom";
import { parseUrlState, serializeUrlState } from "@/lib/url-state";
import { computeNextUp, useWatched } from "@/lib/watched";

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
function BorderLabel({
  dot,
  children,
}: {
  dot: { className?: string; color?: string };
  children: React.ReactNode;
}) {
  return (
    <span className="absolute top-0 left-4 z-10 flex -translate-y-1/2 items-center gap-1.5 rounded-full border bg-card/95 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-card-foreground shadow-md shadow-black/20">
      <span
        className={`size-2 rounded-full ${dot.className ?? ""}`}
        style={{ backgroundColor: dot.color }}
      />
      {children}
    </span>
  );
}

export function Graph() {
  const [initial] = useState(() => parseUrlState(window.location.search));
  const [mode, setMode] = useState<ViewMode>(initial.mode);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId);
  const [focusMode, setFocusMode] = useState<FocusMode>(initial.focusMode);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(initial.displayMode);
  const [grouping, setGrouping] = useState<Grouping>({
    by: initial.groupBy,
    visible: initial.visibleGroups,
  });
  const [media, setMedia] = useState<MediaFilter>(initial.media);
  const graph = WORK_GRAPHS[media];
  const [zoomPercent, setZoomPercent] = useState(INITIAL_ZOOM);
  const { watched, toggleWatched, clearWatched } = useWatched();
  const nextUp = computeNextUp(watched);

  // React Compiler memoizes these, which keeps `layout`/`focusLayout` stable
  // for the reframe effect's deps.
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
  const focusedId = !selectedId && hovered === pending?.id ? hovered : null;
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
      displayMode,
      groupBy: grouping.by,
      visibleGroups: grouping.visible,
      media,
    });
    const { pathname, hash } = window.location;
    window.history.replaceState(window.history.state, "", `${pathname}${search}${hash}`);
  }, [mode, selectedId, focusMode, displayMode, grouping, media]);

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

  // A search pick may be filtered out: show its media and group, select it,
  // then center on it once it's rendered (the effect below).
  const centerOnRef = useRef<string | null>(null);
  const handleSearchSelect = (id: string) => {
    const work = WORK_BY_ID.get(id);
    if (!work) return;
    if (work.tmdb.type !== "movie") setMedia("all");
    const key = groupKeyOf(work, grouping.by);
    if (!grouping.visible.has(key)) {
      setGrouping((current) => ({ ...current, visible: new Set([...current.visible, key]) }));
    }
    setSelectedId(id);
    centerOnRef.current = id;
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

  const focusLayout =
    displayMode === "compact" && selectedId
      ? computeFocusLayout(selectedId, distances, graph)
      : null;
  const focusIds = focusLayout ? new Set(focusLayout.positions.keys()) : null;
  const focusEdgeVisibility = focusIds ? computeEdgeVisibility(focusIds, null, graph) : null;
  const focusGeometry = focusLayout
    ? computeEdgeGeometry(
        focusLayout.height,
        focusLayout.rowCount,
        focusLayout.totalLanes,
        NODE_HEIGHT,
      )
    : null;

  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  useEffect(() => {
    const id = centerOnRef.current;
    // The compact view reframes on its own.
    if (!id || displayMode === "compact") return;
    centerOnRef.current = null;
    // Two frames, as in the reframe effect below.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const scale = Math.max(transformRef.current?.instance.state.scale ?? 0, INITIAL_ZOOM);
        transformRef.current?.zoomToElement(id, { scale }, 400);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedId, layout, displayMode]);
  // Reframes when the display mode (or the compact view's selection) changes.
  // Comparing to the last key makes StrictMode's double-invoke a no-op.
  const lastFocusKeyRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const key = displayMode === "compact" ? `compact:${selectedId ?? ""}` : "inline";
    if (lastFocusKeyRef.current === null || lastFocusKeyRef.current === key) {
      lastFocusKeyRef.current = key;
      return;
    }
    lastFocusKeyRef.current = key;

    // Centered from layout data, not the DOM: nodes may still be mid-spring.
    const centerOn = (pos: Point, spanX: number, spanY: number, scale: number) => {
      const wrapper = transformRef.current?.instance.wrapperComponent;
      if (!wrapper) return;
      const contentX = (pos.x / 100) * spanX;
      const contentY = (pos.y / 100) * spanY;
      transformRef.current?.setTransform(
        wrapper.clientWidth / 2 - contentX * scale,
        wrapper.clientHeight / 2 - contentY * scale,
        scale,
        300,
      );
    };

    const reframe = () => {
      const selectedPos = selectedId ? layout.positions.get(selectedId) : undefined;
      if (displayMode === "compact" && selectedId && focusLayout) {
        const wrapper = transformRef.current?.instance.wrapperComponent;
        const pos = focusLayout.positions.get(selectedId);
        if (!wrapper || !pos) return;
        const scale = Math.min(
          wrapper.clientWidth / focusLayout.width,
          wrapper.clientHeight / focusLayout.height,
        );
        centerOn(pos, focusLayout.width, focusLayout.height, scale);
      } else if (selectedPos) {
        centerOn(selectedPos, canvasWidth, canvasHeight, INITIAL_ZOOM);
      } else {
        transformRef.current?.fitToView({ animationTime: 300 });
      }
    };

    // Two frames, so the library's ResizeObserver (which cancels in-flight
    // animations on resize) has already fired.
    const raf1 = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(reframe);
    });
    rafRef.current = raf1;
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [displayMode, selectedId, focusLayout, layout, canvasWidth, canvasHeight]);

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
        // A linked work opens centered; otherwise start at the Avengers.
        const startId = initial.selectedId ?? AVENGERS_ID;
        if (startId && document.getElementById(startId)) {
          ref.zoomToElement(startId, { scale: INITIAL_ZOOM }, 0);
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
            {focusLayout && focusGeometry && focusEdgeVisibility && focusIds ? (
              <div
                key="compact"
                className="relative"
                style={{ width: focusLayout.width, height: focusLayout.height }}
                role="presentation"
                onClick={() => setSelectedId(null)}
              >
                <GraphEdges
                  edges={graph.edges}
                  positions={focusLayout.positions}
                  activeSet={focusIds}
                  distances={distances}
                  visibleIds={focusIds}
                  axis="y"
                  {...focusGeometry}
                />
                {[...focusLayout.positions.entries()].map(([id, pos]) => {
                  const work = WORK_BY_ID.get(id);
                  if (!work) return null;
                  return (
                    <GraphNode
                      key={id}
                      work={work}
                      x={pos.x}
                      y={pos.y}
                      state={id === selectedId ? "selected" : "ancestor"}
                      delay={0}
                      onSelect={handleSelect}
                      axis="y"
                      hasIncoming={focusEdgeVisibility.hasIncoming.has(id)}
                      hasOutgoing={focusEdgeVisibility.hasOutgoing.has(id)}
                      watched={watched.has(id)}
                      nextUp={nextUp.has(id)}
                    />
                  );
                })}
              </div>
            ) : (
              <div
                key="main"
                className="relative"
                style={{ width: canvasWidth, height: canvasHeight }}
                role="presentation"
                onClick={() => setSelectedId(null)}
                onPointerMove={handleCanvasPointerMove}
                onPointerLeave={() => setPending(null)}
              >
                {groupCards.map(
                  ({ key, label, colorClass, cardClass, top, height, left, width }) => (
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
                      <BorderLabel dot={{ className: colorClass }}>{label}</BorderLabel>
                    </div>
                  ),
                )}
                {phaseBands.map(({ phase, top, height, left, width, color, borderColor }) => (
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
                    <BorderLabel dot={{ color: borderColor }}>Phase {phase}</BorderLabel>
                  </div>
                ))}
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
                      watched={watched.has(work.id)}
                      nextUp={nextUp.has(work.id)}
                    />
                  );
                })}
              </div>
            )}
          </TransformComponent>

          <PosterTooltip />
          {(focusedPhase || focusedCard) && pending && (
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

          <DetailPanel
            selectedId={selectedId}
            onClear={() => setSelectedId(null)}
            watched={watched}
            onToggleWatched={toggleWatched}
            focusMode={focusMode}
            onToggleFocusMode={() =>
              setFocusMode((current) => (current === "chain" ? "immediate" : "chain"))
            }
            displayMode={displayMode}
            onToggleDisplayMode={() =>
              setDisplayMode((current) => (current === "inline" ? "compact" : "inline"))
            }
          />

          <CommandBar
            onSearchSelect={handleSearchSelect}
            mode={mode}
            onModeChange={setMode}
            media={media}
            onMediaChange={handleMediaChange}
            grouping={grouping}
            onToggleGroup={handleToggleGroup}
            onGroupByChange={handleGroupByChange}
            watchedCount={watched.size}
            onClearWatched={clearWatched}
          />
          <ZoomFab
            zoom={zoomPercent}
            onZoomIn={() => utils.zoomIn(0.25)}
            onZoomOut={() => utils.zoomOut(0.25)}
            onFit={() => utils.fitToView()}
          />
        </div>
      )}
    </TransformWrapper>
  );
}
