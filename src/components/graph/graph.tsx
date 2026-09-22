import { useEffect, useRef, useState } from "react";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import { FRANCHISE_META, WORKS, type Franchise } from "@/data/works";
import {
  canvasSize,
  computeEdgeGeometry,
  computeEraBands,
  computeFocusLayout,
  computeFranchiseRows,
  computeLayout,
  computePhaseBands,
  type Axis,
  type Point,
  type ViewMode,
} from "@/lib/graph/layout";
import {
  computeEdgeVisibility,
  getRelatedDistances,
  WORK_BY_ID,
  type FocusMode,
} from "@/lib/graph/relations";

import { DetailPanel } from "./detail-panel";
import { FocusFab } from "./focus-fab";
import { GraphEdges } from "./graph-edges";
import {
  GraphNode,
  HEIGHT as NODE_HEIGHT,
  PosterTooltip,
  WIDTH as NODE_WIDTH,
  type NodeState,
} from "./graph-node";
import { LegendFab } from "./legend-fab";
import { ModeFab } from "./mode-fab";
import { ZoomFab } from "./zoom-fab";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.5;
const INITIAL_ZOOM = 0.6;

export type DisplayMode = "inline" | "compact";

const AVENGERS_ID = WORKS.find((w) => w.thread === "avengers")?.id;

function BandLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="absolute bottom-2 left-2 z-10 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
      style={{ borderColor: color, color, backgroundColor: "rgba(255,255,255,0.85)" }}
    >
      {children}
    </span>
  );
}

export function Graph() {
  const [mode, setMode] = useState<ViewMode>("recommended");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<FocusMode>("chain");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("inline");
  const [visibleFranchises, setVisibleFranchises] = useState<Set<Franchise>>(
    () => new Set<Franchise>(["mcu"]),
  );
  const [zoomPercent, setZoomPercent] = useState(INITIAL_ZOOM);

  // React Compiler memoizes these, which keeps `layout`/`focusLayout` stable
  // for the reframe effect's deps.
  const layout = computeLayout(mode, visibleFranchises);
  const { width: canvasWidth, height: canvasHeight } = canvasSize(layout);
  const franchiseRows = computeFranchiseRows(mode, visibleFranchises);
  const phaseBands = computePhaseBands(mode, layout);
  const eraBands = computeEraBands(mode, layout, visibleFranchises);

  const distances = selectedId
    ? getRelatedDistances(selectedId, focusMode)
    : new Map<string, number>();
  const activeSet = selectedId ? new Set([selectedId, ...distances.keys()]) : null;

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

  const handleSelect = (id: string) => {
    setSelectedId((current) => (current === id ? null : id));
  };

  const handleToggleFranchise = (franchise: Franchise) => {
    setVisibleFranchises((current) => {
      if (current.has(franchise) && current.size === 1) return current;
      const next = new Set(current);
      if (next.has(franchise)) next.delete(franchise);
      else next.add(franchise);
      return next;
    });
  };

  const visibleWorks = WORKS.filter((w) => visibleFranchises.has(w.franchise));
  const visibleIds = new Set(visibleWorks.map((w) => w.id));
  const edgeVisibility = computeEdgeVisibility(visibleIds);

  const axis: Axis = mode === "recommended" ? "y" : "x";
  const geometry = computeEdgeGeometry(
    axis === "y" ? canvasHeight : canvasWidth,
    axis === "y" ? layout.rowCount : layout.totalLanes,
    axis === "y" ? layout.totalLanes : layout.rowCount,
    axis === "y" ? NODE_HEIGHT : NODE_WIDTH,
  );

  const focusLayout =
    displayMode === "compact" && selectedId ? computeFocusLayout(selectedId, distances) : null;
  const focusIds = focusLayout ? new Set(focusLayout.positions.keys()) : null;
  const focusEdgeVisibility = focusIds ? computeEdgeVisibility(focusIds) : null;
  const focusGeometry = focusLayout
    ? computeEdgeGeometry(
        focusLayout.height,
        focusLayout.rowCount,
        focusLayout.totalLanes,
        NODE_HEIGHT,
      )
    : null;

  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
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
      wheel={{ step: 0.15 }}
      pinch={{ step: 5 }}
      onTransform={(_ref, state) => setZoomPercent(state.scale)}
      onInit={(ref) => {
        transformRef.current = ref;
        // The wrapper is still natively scrollable (e.g. focus scroll-into-view),
        // which would skew every transform calculation.
        const wrapper = ref.instance.wrapperComponent;
        wrapper?.addEventListener("scroll", () => {
          wrapper.scrollTop = 0;
          wrapper.scrollLeft = 0;
        });
        if (AVENGERS_ID) ref.zoomToElement(AVENGERS_ID, { scale: INITIAL_ZOOM }, 0);
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
              >
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
                    <BandLabel color={borderColor}>Phase {phase}</BandLabel>
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
                    <BandLabel color={borderColor}>{label}</BandLabel>
                  </div>
                ))}
                {franchiseRows.map(({ franchise, top, height }) => (
                  <div
                    key={franchise}
                    className="absolute inset-x-0 border-t border-border/40 first:border-t-0"
                    style={{ top: `${top}%`, height: `${height}%` }}
                  >
                    <span className="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-full border border-border/60 bg-white/85 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                      <span
                        className={`size-2 rounded-full ${FRANCHISE_META[franchise].colorClass}`}
                      />
                      {FRANCHISE_META[franchise].label}
                    </span>
                  </div>
                ))}
                <GraphEdges
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
            )}
          </TransformComponent>

          <PosterTooltip />

          <DetailPanel selectedId={selectedId} onClear={() => setSelectedId(null)} />

          {selectedId && (
            <FocusFab
              focusMode={focusMode}
              onToggleFocusMode={() =>
                setFocusMode((current) => (current === "chain" ? "immediate" : "chain"))
              }
              displayMode={displayMode}
              onToggleDisplayMode={() =>
                setDisplayMode((current) => (current === "inline" ? "compact" : "inline"))
              }
            />
          )}

          <LegendFab visibleFranchises={visibleFranchises} onToggle={handleToggleFranchise} />
          <ModeFab mode={mode} onChange={setMode} />
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
