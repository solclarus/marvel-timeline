import { Check } from "lucide-react";
import * as m from "motion/react-m";

import {
  createTooltipHandle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EARTH_META, earthsOf, type WorkNode } from "@/data/works";
import type { Axis } from "@/lib/graph/layout";

import { PosterThumb } from "./poster-thumb";

export type NodeState = "selected" | "ancestor" | "dimmed" | "neutral";

export const NODE_STATE_STYLE: Record<
  NodeState,
  { opacity: number; scale: number; grayscale: boolean }
> = {
  selected: { opacity: 1, scale: 1.25, grayscale: false },
  ancestor: { opacity: 1, scale: 1, grayscale: false },
  neutral: { opacity: 1, scale: 1, grayscale: false },
  dimmed: { opacity: 0.15, scale: 0.85, grayscale: true },
};

export const WIDTH = 68;
export const HEIGHT = 102;

interface Props {
  work: WorkNode;
  x: number;
  y: number;
  state: NodeState;
  delay: number;
  onSelect: (id: string) => void;
  axis: Axis;
  hasIncoming: boolean;
  hasOutgoing: boolean;
  watched: boolean;
  // Every prerequisite is watched.
  nextUp: boolean;
}

const NUB_CLASS = {
  y: {
    incoming:
      "absolute top-0 left-1/2 z-10 h-1 w-2 -translate-x-1/2 -translate-y-full rounded-t-full bg-black",
    outgoing:
      "absolute bottom-0 left-1/2 z-10 h-1 w-2 -translate-x-1/2 translate-y-full rounded-b-full bg-black",
  },
  x: {
    incoming:
      "absolute top-1/2 left-0 z-10 h-2 w-1 -translate-x-full -translate-y-1/2 rounded-l-full bg-black",
    outgoing:
      "absolute top-1/2 right-0 z-10 h-2 w-1 translate-x-full -translate-y-1/2 rounded-r-full bg-black",
  },
} as const;

export function GraphNode({
  work,
  x,
  y,
  state,
  delay,
  onSelect,
  axis,
  hasIncoming,
  hasOutgoing,
  watched,
  nextUp,
}: Props) {
  const style = NODE_STATE_STYLE[state];
  const nubClass = NUB_CLASS[axis];
  const earths = earthsOf(work);

  return (
    <TooltipTrigger
      handle={posterTooltip}
      payload={work.title}
      render={
        <m.button
          type="button"
          id={work.id}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(work.id);
          }}
          className="absolute"
          style={{ width: WIDTH, height: HEIGHT, translate: "-50% -50%" }}
          initial={false}
          animate={{
            left: `${x}%`,
            top: `${y}%`,
            opacity: style.opacity,
            scale: style.scale,
          }}
          transition={{
            left: { type: "spring", stiffness: 140, damping: 22 },
            top: { type: "spring", stiffness: 140, damping: 22 },
            opacity: { duration: 0.3, delay },
            scale: { duration: 0.25, delay, ease: "easeOut" },
          }}
          whileHover={{ scale: style.scale * 1.15 }}
          whileTap={{ scale: style.scale * 0.95 }}
          aria-label={`${work.title}${earths.length > 1 ? ` (${earths.map((e) => EARTH_META[e].label).join(" / ")})` : ""}${watched ? " (watched)" : nextUp ? " (up next)" : ""}`}
        />
      }
    >
      {hasIncoming && <span aria-hidden className={nubClass.incoming} />}
      <div
        className={`relative size-full overflow-hidden rounded-[3px] border border-border/70 shadow-[0_4px_10px_rgba(0,0,0,0.45)] ${style.grayscale ? "grayscale" : ""} ${nextUp ? "ring-3 ring-sky-500 ring-offset-2 ring-offset-stone-200" : ""}`}
      >
        <PosterThumb work={work} />
        {earths.length > 1 && (
          <span
            aria-hidden
            className="absolute top-1 left-1 flex gap-0.5 rounded-full bg-black/65 p-0.5"
          >
            {earths.map((earth) => (
              <span
                key={earth}
                className={`size-1.5 rounded-full ${EARTH_META[earth].colorClass}`}
              />
            ))}
          </span>
        )}
      </div>
      {watched && (
        <span
          aria-hidden
          className={`absolute -top-1.5 -right-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow ${style.grayscale ? "grayscale" : ""}`}
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
      {hasOutgoing && <span aria-hidden className={nubClass.outgoing} />}
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
