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
  groupKeyOf,
  isWorkVisible,
  regroup,
  type GroupBy,
  type Grouping,
} from "@/lib/graph/groups";
import {
  canvasSize,
  computeEdgeGeometry,
  computeEraBands,
  computeGroupCards,
  computeLayout,
  computePhaseBands,
  computeSagaBands,
  computeYearMarks,
  type Axis,
  type ViewMode,
} from "@/lib/graph/layout";
import {
  computeEdgeVisibility,
  getRelatedDistances,
  WORK_BY_ID,
  graphForMedia,
  WORK_GRAPHS,
  type FocusMode,
  type MediaFilter,
} from "@/lib/graph/relations";
import { routeWorks, watchFirst } from "@/lib/graph/watch-order";
import { useI18n } from "@/lib/i18n";
import { motionMs } from "@/lib/motion";
import { parseUrlState, withMedium, type Display, type ListFocus } from "@/lib/url-state";

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
import { ListView, type ListFocusView } from "./list-view";
import { MapBackdrop } from "./map-backdrop";
import { useHoverFocus } from "./use-hover-focus";
import { useSelectionFit } from "./use-selection-fit";
import { useUrlSync } from "./use-url-sync";
import { ZoomFab } from "./zoom-fab";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.5;
const INITIAL_ZOOM = 0.6;
// Fitting a selection never zooms past 100%, so a work with few relatives
// isn't blown up.
const FIT_SCALE = { min: MIN_ZOOM, max: 1 };
const NODE_SIZE = { width: NODE_WIDTH, height: NODE_HEIGHT };

const AVENGERS_ID = WORKS.find((w) => w.thread === "avengers")?.id;

// Phones start on the list; the map is hard to read that small.
const DEVICE_DISPLAY: Display = window.matchMedia("(max-width: 640px)").matches ? "list" : "map";

export function Graph() {
  const { t, groupLabel, titleOf, locale } = useI18n();
  const [initial] = useState(() => parseUrlState(window.location.search));
  const [mode, setMode] = useState<ViewMode>(initial.mode);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId);
  const [focusMode, setFocusMode] = useState<FocusMode>(initial.focusMode);
  const [grouping, setGrouping] = useState<Grouping>({
    by: initial.groupBy,
    visible: initial.visibleGroups,
  });
  const [media, setMedia] = useState<MediaFilter>(initial.media);
  const [display, setDisplay] = useState<Display>(
    initial.listFocus ? "list" : (initial.display ?? DEVICE_DISPLAY),
  );
  // The list narrowed to a watch-first path or a route; clearing it returns
  // to whichever display was showing before.
  const [listFocus, setListFocus] = useState<ListFocus | null>(initial.listFocus);
  const [displayBeforeFocus, setDisplayBeforeFocus] = useState<Display | null>(null);
  const openListFocus = (next: ListFocus) => {
    if (!listFocus) setDisplayBeforeFocus(display);
    setDisplay("list");
    setListFocus(next);
  };
  const clearListFocus = () => {
    setListFocus(null);
    if (displayBeforeFocus) setDisplay(displayBeforeFocus);
    setDisplayBeforeFocus(null);
  };
  const handleDisplayChange = (next: Display) => {
    setListFocus(null);
    setDisplayBeforeFocus(null);
    setDisplay(next);
  };
  const graph = graphForMedia(media);
  const [zoomPercent, setZoomPercent] = useState(INITIAL_ZOOM);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  // React Compiler memoizes these, which keeps `layout` and `canvas` stable
  // for the selection fit.
  const layout = computeLayout(mode, grouping, graph);
  const canvas = canvasSize(layout);
  const phaseBands = computePhaseBands(mode, layout, grouping, graph);
  const sagaBands = computeSagaBands(layout, phaseBands);
  const groupCards = computeGroupCards(mode, layout, grouping, sagaBands);
  const eraBands = computeEraBands(mode, layout, grouping);
  const yearMarks = computeYearMarks(mode, layout, grouping);

  const focus = useHoverFocus({
    groupCards,
    phaseBands,
    selectedId,
    onPin: () => setSelectedId(null),
  });

  const distances = selectedId
    ? getRelatedDistances(selectedId, focusMode, graph)
    : new Map<string, number>();
  const activeSet = computeActiveSet({
    selectedId,
    distances,
    focusedPhase: focus.focusedPhase?.phase,
    focusedGroup: focus.focusedCard?.key,
    grouping,
    graph,
  });
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
      // A dialog takes Escape for itself; the selection stays. A narrowed
      // list widens back first.
      if (event.key !== "Escape" || document.querySelector("[data-slot=dialog-content]")) return;
      if (listFocus) clearListFocus();
      else setSelectedId(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  useUrlSync({
    mode,
    selectedId,
    focusMode,
    groupBy: grouping.by,
    visibleGroups: grouping.visible,
    media,
    display: display === DEVICE_DISPLAY || listFocus ? null : display,
    listFocus,
  });

  useSelectionFit({
    transformRef,
    fitKey: selectedId
      ? [
          selectedId,
          focusMode,
          media,
          mode,
          display,
          grouping.by,
          [...grouping.visible].sort().join(","),
        ].join("|")
      : null,
    selectedId,
    focusMode,
    graph,
    layout,
    canvas,
    node: NODE_SIZE,
    scale: FIT_SCALE,
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
    setSelectedId((current) => (current === id ? null : id));
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
    if (selected && !next.includes(mediumOf(selected))) setSelectedId(null);
  };

  // A search pick may be filtered out: show its media and group, then select
  // it (which fits the view to it).
  const handleSearchSelect = (id: string) => {
    const work = WORK_BY_ID.get(id);
    if (!work) return;
    setMedia((current) => withMedium(current, mediumOf(work)));
    const key = groupKeyOf(work, grouping.by);
    if (!grouping.visible.has(key)) {
      setGrouping((current) => ({ ...current, visible: new Set([...current.visible, key]) }));
    }
    setSelectedId(id);
  };

  const visibleWorks = graph.works.filter((w) => isWorkVisible(w, grouping));
  const visibleIds = new Set(visibleWorks.map((w) => w.id));
  const edges = edgesToDraw(mode, graph.edges, selectedId, activeSet);
  // Nubs follow the drawn edges, so none show where lines are hidden.
  const edgeVisibility = computeEdgeVisibility(visibleIds, activeSet, { ...graph, edges });

  const axis: Axis = mode === "recommended" ? "y" : "x";
  const geometry = computeEdgeGeometry(
    axis === "y" ? canvas.height : canvas.width,
    axis === "y" ? layout.rowCount : layout.totalLanes,
    axis === "y" ? NODE_HEIGHT : NODE_WIDTH,
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
            wrapperClass="!block !h-screen !w-full bg-neutral-800"
            contentClass="!items-start"
          >
            <div
              className="relative"
              style={{ width: canvas.width, height: canvas.height }}
              role="presentation"
              onClick={() => {
                setSelectedId(null);
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
                eraBands={eraBands}
                yearMarks={yearMarks}
                focusedCardKey={focus.focusedCard?.key}
                pinnedId={focus.pinnedId}
                onTogglePinned={focus.togglePinned}
              />
              <GraphEdges
                edges={edges}
                positions={layout.positions}
                activeSet={activeSet}
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
                      activeSet?.has(work.id) ? Math.abs(distances.get(work.id) ?? 0) * 0.06 : 0
                    }
                    onSelect={handleSelect}
                    onKeyboardFocus={handleKeyboardFocus}
                    axis={axis}
                    hasIncoming={edgeVisibility.hasIncoming.has(work.id)}
                    hasOutgoing={edgeVisibility.hasOutgoing.has(work.id)}
                  />
                );
              })}
            </div>
          </TransformComponent>

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

  const focusView = ((): ListFocusView | null => {
    if (listFocus?.kind === "before") {
      const work = WORK_BY_ID.get(listFocus.id);
      if (!work) return null;
      const steps = watchFirst(work.id, graph);
      return {
        title: t.watchBefore(titleOf(work)),
        items: [...steps, { work }],
        empty: steps.length === 0 ? t.nothingFirst : undefined,
        onClear: clearListFocus,
      };
    }
    if (listFocus?.kind === "route") {
      const route = ROUTES.find((r) => r.id === listFocus.id);
      if (!route) return null;
      const ja = locale === "ja";
      return {
        title: ja ? route.titleJa : route.title,
        summary: ja ? route.summaryJa : route.summary,
        items: routeWorks(route, WORK_GRAPHS.all).map((work) => ({ work })),
        onClear: clearListFocus,
      };
    }
    return null;
  })();

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
          activeSet={selectedId ? activeSet : null}
          distances={distances}
          onSelect={focusView ? handleSearchSelect : handleSelect}
          focus={focusView}
        />
      )}
      <DetailPanel
        selectedId={selectedId}
        onClear={() => setSelectedId(null)}
        onOpen={() => selectedId && openListFocus({ kind: "before", id: selectedId })}
      />

      <CommandBar
        display={display}
        onDisplayChange={handleDisplayChange}
        onRouteSelect={(id) => openListFocus({ kind: "route", id })}
        onSearchSelect={handleSearchSelect}
        mode={mode}
        onModeChange={setMode}
        media={media}
        onMediaChange={handleMediaChange}
        grouping={grouping}
        onVisibleGroupsChange={handleVisibleGroupsChange}
        onGroupByChange={handleGroupByChange}
        focusMode={focusMode}
        onFocusModeChange={setFocusMode}
      />
    </>
  );
}
