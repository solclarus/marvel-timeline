import * as m from "motion/react-m";

import {
  createTooltipHandle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { earthsOf, type WorkNode } from "@/data/works";
import type { Axis } from "@/lib/graph/layout";
import type { NodeArt } from "@/lib/graph/metrics";
import { useI18n } from "@/lib/i18n";

import { Logo } from "./logo";
import { Poster } from "./poster";

export type NodeState = "selected" | "ancestor" | "dimmed" | "neutral";

const NODE_STATE_STYLE: Record<NodeState, { opacity: number; scale: number; grayscale: boolean }> =
  {
    selected: { opacity: 1, scale: 1, grayscale: false },
    ancestor: { opacity: 1, scale: 1, grayscale: false },
    neutral: { opacity: 1, scale: 1, grayscale: false },
    dimmed: { opacity: 0.15, scale: 0.85, grayscale: true },
  };

// How posters move to a new layout position.
const MOVE = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

interface Props {
  work: WorkNode;
  // Center, in canvas pixels.
  x: number;
  y: number;
  state: NodeState;
  delay: number;
  onSelect: (id: string) => void;
  // Keyboard focus landed here (not a click): bring the poster into view.
  onKeyboardFocus: (id: string) => void;
  axis: Axis;
  hasIncoming: boolean;
  hasOutgoing: boolean;
  // Timelines: the work's group color, as a bar under the poster.
  markClass?: string;
  art: NodeArt;
  size: { width: number; height: number };
}

const NUB_CLASS = {
  y: {
    incoming:
      "absolute top-0 left-1/2 z-10 h-1 w-2 -translate-x-1/2 -translate-y-full rounded-t-full bg-neutral-300",
    outgoing:
      "absolute bottom-0 left-1/2 z-10 h-1 w-2 -translate-x-1/2 translate-y-full rounded-b-full bg-neutral-300",
  },
  x: {
    incoming:
      "absolute top-1/2 left-0 z-10 h-2 w-1 -translate-x-full -translate-y-1/2 rounded-l-full bg-neutral-300",
    outgoing:
      "absolute top-1/2 right-0 z-10 h-2 w-1 translate-x-full -translate-y-1/2 rounded-r-full bg-neutral-300",
  },
} as const;

export function GraphNode({
  work,
  x,
  y,
  state,
  delay,
  onSelect,
  onKeyboardFocus,
  axis,
  hasIncoming,
  hasOutgoing,
  markClass,
  art,
  size,
}: Props) {
  const style = NODE_STATE_STYLE[state];
  const nubClass = NUB_CLASS[axis];
  const { titleOf, earthLabel } = useI18n();
  const title = titleOf(work);
  const earths = earthsOf(work);

  return (
    <TooltipTrigger
      handle={posterTooltip}
      payload={title}
      render={
        <m.button
          type="button"
          id={work.id}
          data-work-id={work.id}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(work.id);
          }}
          onFocus={(e) => {
            if (e.currentTarget.matches(":focus-visible")) onKeyboardFocus(work.id);
          }}
          className={`absolute rounded-thumb outline-none focus-visible:ring-4 focus-visible:ring-marquee focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800 ${state === "selected" ? "ring-2 ring-marquee ring-offset-2 ring-offset-neutral-800" : ""}`}
          aria-pressed={state === "selected"}
          style={{
            left: 0,
            top: 0,
            width: size.width,
            height: size.height,
            translate: "-50% -50%",
          }}
          initial={false}
          animate={{
            x,
            y,
            opacity: style.opacity,
            scale: style.scale,
          }}
          transition={{
            // Moves by transform, so a layout change stays smooth.
            x: MOVE,
            y: MOVE,
            opacity: { duration: 0.3, delay },
            scale: { duration: 0.25, delay, ease: "easeOut" },
          }}
          whileHover={{ scale: style.scale * 1.05 }}
          whileTap={{ scale: style.scale * 0.97 }}
          aria-label={`${title}${earths.length > 1 ? ` (${earths.map(earthLabel).join(" / ")})` : ""}`}
        />
      }
    >
      {hasIncoming && <span aria-hidden className={nubClass.incoming} />}
      <div
        className={`relative size-full overflow-hidden rounded-thumb border border-border/70 shadow-[0_4px_10px_rgba(0,0,0,0.45)] ${style.grayscale ? "grayscale" : ""}`}
      >
        {art === "logo" ? <Logo work={work} /> : <Poster work={work} />}
      </div>
      {hasOutgoing && <span aria-hidden className={nubClass.outgoing} />}
      {markClass && (
        <span
          aria-hidden
          className={`absolute -bottom-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full ${markClass}`}
        />
      )}
    </TooltipTrigger>
  );
}

// One shared popup for every poster instead of one per node.
const posterTooltip = createTooltipHandle<string>();

export function PosterTooltip() {
  return (
    <Tooltip handle={posterTooltip}>
      {({ payload }) => <TooltipContent>{payload}</TooltipContent>}
    </Tooltip>
  );
}
