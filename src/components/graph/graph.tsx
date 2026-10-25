import { useEffect, useRef, useState } from "react";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import { ROUTES } from "@/data/routes";
import { mediumOf, WORKS } from "@/data/works";
import { computeActiveSet, edgesToDraw } from "@/lib/graph/focus";
import {
  GROUPS,
  groupKeyOf,
  isWorkVisible,
  regroup,
  type GroupBy,
  type Grouping,
} from "@/lib/graph/groups";
import {
  canvasSize,
  computeEdgeGeometry,
  computeGroupCards,
  computeLayout,
  computePhaseBands,
  computeSagaBands,
  computeTimelineBackdrop,
  type Axis,
  type ViewMode,
} from "@/lib/graph/layout";
import {
  computeEdgeVisibility,
  getRelatedDistances,
  WORK_BY_ID,
  WORK_GRAPHS,
  graphForMedia,
  type MediaFilter,
} from "@/lib/graph/relations";
import { routeWorks, watchFirst } from "@/lib/graph/watch-order";
import { useI18n } from "@/lib/i18n";
import { motionMs } from "@/lib/motion";
import { parseUrlState, withMedium } from "@/lib/url-state";

import { CommandBar } from "./command-bar";
import { attachDesktopInput, keepInView } from "./desktop-input";
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
import { ListView } from "./list-view";
import { MapBackdrop } from "./map-backdrop";
import { TimelineLabels } from "./timeline-labels";
import { useCard } from "./use-card";
import { DEVICE_DISPLAY, useDisplay } from "./use-display";
import { useHoverFocus } from "./use-hover-focus";
import { useSelectionFit } from "./use-selection-fit";
import { useUrlSync } from "./use-url-sync";
import { ZoomFab } from "./zoom-fab";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.5;
const INITIAL_ZOOM = 0.6;
// Fitting a selection never zooms past 100%, so a work with few relatives
// isn't blown up, nor below 50%, so a work many build on stays readable
// (the fit then keeps the selection in sight rather than every relative).
const FIT_SCALE = { min: 0.5, max: 1 };
const NODE_SIZE = { width: NODE_WIDTH, height: NODE_HEIGHT };

const AVENGERS_ID = WORKS.find((w) => w.thread === "avengers")?.id;

export function Graph() {
  const { t, groupLabel } = useI18n();
  const [initial] = useState(() => parseUrlState(window.location.search));
  const [mode, setMode] = useState<ViewMode>(initial.mode);
  const [grouping, setGrouping] = useState<Grouping>({
    by: initial.groupBy,
    visible: initial.visibleGroups,
  });
  const [media, setMedia] = useState<MediaFilter>(initial.media);
  const [display, setDisplay] = useDisplay(initial.display);
  const card = useCard(initial);
  const { selectedId } = card;
  const graph = graphForMedia(media);
  const [zoomPercent, setZoomPercent] = useState(INITIAL_ZOOM);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  // React Compiler memoizes these, which keeps `layout` and `canvas` stable
  // for the selection fit.
  const layout = computeLayout(mode, grouping, graph);
  const canvas = canvasSize(layout);
  const phaseBands = computePhaseBands(mode, layout, grouping);
  const sagaBands = computeSagaBands(layout, phaseBands);
  const groupCards = computeGroupCards(mode, layout, grouping, sagaBands);
  const timeline = computeTimelineBackdrop(layout);

  const focus = useHoverFocus({
    groupCards,
    phaseBands,
    selectedId,
    onPin: () => card.select(null),
  });

  // The map ties a selection to the works just before and after it; the
  // whole chain lit up at once was too much to read. The list, a watch
  // order, marks the whole chain.
  const distances = selectedId
    ? getRelatedDistances(selectedId, display === "map" ? "immediate" : "chain", graph)
    : new Map<string, number>();
  // While the card lists works (a watch-first path or a route), those are
  // what light up behind it.
  const listed =
    card.current?.kind === "route"
      ? routeWorks(
          ROUTES.find((r) => r.id === card.current!.id)!,
          WORK_GRAPHS.all,
        )
      : card.current?.open
        ? watchFirst(card.current.id, graph).map((step) => step.work)
        : null;
  const activeSet = listed
    ? new Set([...listed.map((w) => w.id), ...(selectedId ? [selectedId] : [])])
    : computeActiveSet({
        selectedId,
        distances,
        focusedPhase: focus.focusedPhase?.phase,
        focusedGroup: focus.focusedCard?.key,
        grouping,
        graph,
      });
  // Timelines place works by date rather than by what they build on, so
  // relatives there are scattered across the map: a selection lights only
  // itself. The list still marks them.
  const showRelatives = mode === "recommended";
  const mapActiveSet = selectedId && !listed && !showRelatives ? new Set([selectedId]) : activeSet;
  const nodeState = (id: string): NodeState =>
    !mapActiveSet
      ? "neutral"
      : id === selectedId
        ? "selected"
        : mapActiveSet.has(id)
          ? "ancestor"
          : "dimmed";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // A dialog takes Escape for itself; the card stays.
      if (event.key !== "Escape" || document.querySelector("[data-slot=dialog-content]")) return;
      card.escape();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  useUrlSync({
    mode,
    selectedId,
    groupBy: grouping.by,
    visibleGroups: grouping.visible,
    media,
    display: display === DEVICE_DISPLAY ? null : display,
    listFocus: card.listFocus,
  });

  useSelectionFit({
    transformRef,
    fitKey: selectedId
      ? [
          selectedId,
          media,
          mode,
          display,
          grouping.by,
          [...grouping.visible].sort().join(","),
        ].join("|")
      : null,
    selectedId,
    withRelatives: showRelatives,
    graph,
    layout,
    canvas,
    node: NODE_SIZE,
    scale: FIT_SCALE,
  });

  // Timelines open on their first year, as wide as fits the screen (within
  // 40–80%), so the calendar reads from its top-left.
  const showTimelineStart = (ref: ReactZoomPanPinchRef, animationTime: number) => {
    const wrapper = ref.instance.wrapperComponent;
    if (!wrapper) return;
    const scale = Math.min(0.8, Math.max(0.4, (wrapper.clientWidth - 160) / canvas.width));
    const x = Math.max(72, (wrapper.clientWidth - canvas.width * scale) / 2);
    ref.setTransform(x, 40, scale, animationTime);
  };
  // Switching into a timeline starts it over the same way; a selection is
  // fitted instead.
  const lastModeRef = useRef(mode);
  useEffect(() => {
    if (lastModeRef.current === mode) return;
    lastModeRef.current = mode;
    const ref = transformRef.current;
    if (!ref || mode === "recommended" || selectedId) return;
    // Two frames, so the library's ResizeObserver (which cancels in-flight
    // animations on resize) has already seen the new canvas.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => showTimelineStart(ref, motionMs(300)));
    });
    return () => cancelAnimationFrame(raf);
  });

  // Tabbing onto a poster outside the viewport pans it to the center: the
  // wrapper's native scroll is pinned, so the browser can't scroll it in.
  const handleKeyboardFocus = (id: string) => {
    const ref = transformRef.current;
    const wrapper = ref?.instance.wrapperComponent;
    const element = document.getElementById(id);
    if (!ref || !wrapper || !element) return;
    const view = wrapper.getBoundingClientRect();
    const poster = element.getBoundingClientRect();
    const inView =
      poster.left >= view.left &&
      poster.right <= view.right &&
      poster.top >= view.top + 88 &&
      poster.bottom <= view.bottom - 88;
    if (inView) return;
    const { positionX, positionY, scale } = ref.instance.state;
    const dx = view.left + view.width / 2 - (poster.left + poster.width / 2);
    const dy = view.top + view.height / 2 - (poster.top + poster.height / 2);
    ref.setTransform(positionX + dx, positionY + dy, scale, motionMs(250));
  };

  const handleSelect = (id: string) => {
    card.select(selectedId === id ? null : id);
  };

  const handleVisibleGroupsChange = (visible: Set<string>) => {
    // At least one group stays on screen.
    if (visible.size === 0) return;
    setGrouping((current) => ({ ...current, visible }));
  };

  const handleGroupByChange = (by: GroupBy) => {
    setGrouping((current) => regroup(current, by, WORKS));
  };

  const handleMediaChange = (next: MediaFilter) => {
    setMedia(next);
    // A selection whose kind is filtered out leaves the map.
    const selected = selectedId ? WORK_BY_ID.get(selectedId) : undefined;
    if (selected && !next.includes(mediumOf(selected))) card.select(null);
  };

  // A pick from search or the card's list may be filtered out: show its
  // media and group first, so selecting it fits the view to it.
  const reveal = (id: string) => {
    const work = WORK_BY_ID.get(id);
    if (!work) return false;
    setMedia((current) => withMedium(current, mediumOf(work)));
    const key = groupKeyOf(work, grouping.by);
    if (!grouping.visible.has(key)) {
      setGrouping((current) => ({ ...current, visible: new Set([...current.visible, key]) }));
    }
    return true;
  };
  const handleSearchSelect = (id: string) => {
    if (reveal(id)) card.select(id);
  };

  const visibleWorks = graph.works.filter((w) => isWorkVisible(w, grouping));
  const visibleIds = new Set(visibleWorks.map((w) => w.id));
  const edges = edgesToDraw(mode, graph.edges);
  // Nubs follow the drawn edges, so none show where lines are hidden.
  const edgeVisibility = computeEdgeVisibility(visibleIds, mapActiveSet, { ...graph, edges });

  const axis: Axis = mode === "recommended" ? "y" : "x";
  const geometry = computeEdgeGeometry(
    axis === "y" ? canvas.height : canvas.width,
    axis === "y" ? layout.rowCount : layout.totalLanes,
    axis === "y" ? NODE_HEIGHT : NODE_WIDTH,
    axis === "y" ? (layout.headerPx ?? 0) : 0,
  );

  const map = (
    <TransformWrapper
      minScale={MIN_ZOOM}
      maxScale={MAX_ZOOM}
      initialScale={INITIAL_ZOOM}
      limitToBounds={false}
      centerOnInit={false}
      doubleClick={{ step: 0.6, mode: "zoomIn" }}
      // Desktop wheel and trackpad input is handled by attachDesktopInput.
      wheel={{ disabled: true }}
      pinch={{ step: 5 }}
      onTransform={(_ref, state) => setZoomPercent(state.scale)}
      // Dragging may overshoot; it eases back once released.
      onPanningStop={(ref) => {
        const { positionX: x, positionY: y, scale } = ref.instance.state;
        const next = keepInView(ref, { x, y, scale });
        if (next.x !== x || next.y !== y) ref.setTransform(next.x, next.y, scale, motionMs(200));
      }}
      onInit={(ref) => {
        transformRef.current = ref;
        attachDesktopInput(ref, { minScale: MIN_ZOOM, maxScale: MAX_ZOOM });
        // A linked work is fitted by the selection fit; otherwise start at
        // the Avengers, or a timeline's first year.
        if (selectedId) return;
        if (mode !== "recommended") {
          showTimelineStart(ref, 0);
        } else if (AVENGERS_ID && document.getElementById(AVENGERS_ID)) {
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
            wrapperClass="!block !h-screen !w-full bg-neutral-800"
            contentClass="!items-start"
          >
            <div
              className="relative"
              style={{ width: canvas.width, height: canvas.height }}
              role="presentation"
              onClick={() => {
                card.select(null);
                focus.clearPinned();
              }}
              onPointerMove={focus.onPointerMove}
              onPointerLeave={focus.onPointerLeave}
            >
              <MapBackdrop
                groupBy={grouping.by}
                groupCards={groupCards}
                phaseBands={phaseBands}
                sagaBands={sagaBands}
                timeline={timeline}
                focusedCardKey={focus.focusedCard?.key}
                pinnedId={focus.pinnedId}
                onTogglePinned={focus.togglePinned}
              />
              <GraphEdges
                edges={edges}
                positions={layout.positions}
                activeSet={mapActiveSet}
                distances={distances}
                visibleIds={visibleIds}
                axis={axis}
                {...geometry}
                canvas={canvas}
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
                      mapActiveSet?.has(work.id) ? Math.abs(distances.get(work.id) ?? 0) * 0.06 : 0
                    }
                    onSelect={handleSelect}
                    onKeyboardFocus={handleKeyboardFocus}
                    axis={axis}
                    hasIncoming={edgeVisibility.hasIncoming.has(work.id)}
                    hasOutgoing={edgeVisibility.hasOutgoing.has(work.id)}
                    markClass={
                      layout.timeline
                        ? GROUPS[grouping.by].find((g) => g.key === groupKeyOf(work, grouping.by))
                            ?.colorClass
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </TransformComponent>

          {layout.timeline && <TimelineLabels grid={layout.timeline} canvas={canvas} />}
          <PosterTooltip />
          {focus.hoverChipAt && (focus.focusedPhase || focus.focusedCard) && (
            <GroupHoverChip
              key={focus.hoverChipAt.id}
              label={
                focus.focusedPhase
                  ? t.phase(focus.focusedPhase.phase)
                  : groupLabel(grouping.by, focus.focusedCard!.key)
              }
              dot={
                focus.focusedPhase
                  ? { color: focus.focusedPhase.borderColor }
                  : { className: focus.focusedCard!.colorClass }
              }
              count={activeSet?.size ?? 0}
              initial={focus.hoverChipAt}
            />
          )}

          <ZoomFab
            zoom={zoomPercent}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onZoomIn={() => utils.zoomIn(0.25, motionMs(200))}
            onZoomOut={() => utils.zoomOut(0.25, motionMs(200))}
            onFit={() => utils.fitToView({ animationTime: motionMs(200) })}
          />
        </div>
      )}
    </TransformWrapper>
  );

  return (
    <>
      {display === "map" ? (
        map
      ) : (
        <ListView
          mode={mode}
          grouping={grouping}
          graph={graph}
          selectedId={selectedId}
          activeSet={selectedId || listed ? activeSet : null}
          distances={distances}
          onSelect={handleSelect}
          cardShown={card.current !== null}
        />
      )}
      <DetailPanel
        view={card.current}
        previous={card.previous}
        graph={graph}
        onClose={card.close}
        onBack={card.back}
        onToggle={card.toggleOpen}
        onPick={(id) => reveal(id) && card.pick(id)}
      />

      <CommandBar
        display={display}
        onDisplayChange={setDisplay}
        onRouteSelect={card.openRoute}
        onSearchSelect={handleSearchSelect}
        mode={mode}
        onModeChange={setMode}
        media={media}
        onMediaChange={handleMediaChange}
        grouping={grouping}
        onVisibleGroupsChange={handleVisibleGroupsChange}
        onGroupByChange={handleGroupByChange}
      />
    </>
  );
}
