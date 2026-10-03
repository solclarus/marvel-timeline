import type { computeEraBands, computeGroupCards, computePhaseBands } from "@/lib/graph/layout";

import { BorderLabel } from "./border-label";

interface Props {
  groupCards: ReturnType<typeof computeGroupCards>;
  phaseBands: ReturnType<typeof computePhaseBands>;
  eraBands: ReturnType<typeof computeEraBands>;
  focusedCardKey: string | undefined;
  pinnedId: string | null;
  onTogglePinned: (id: string) => void;
}

const box = (b: { top?: number; height?: number; left: number; width: number }) => ({
  ...(b.top !== undefined && { top: `${b.top}%`, height: `${b.height}%` }),
  left: `${b.left}%`,
  width: `${b.width}%`,
});

// Everything drawn behind the edges and posters: franchise/Earth cards, MCU
// phase bands, and (in timeline modes) decade bands, each with its label.
export function MapBackdrop({
  groupCards,
  phaseBands,
  eraBands,
  focusedCardKey,
  pinnedId,
  onTogglePinned,
}: Props) {
  return (
    <>
      {groupCards.map((card) => (
        <div
          key={card.key}
          className={`absolute rounded-2xl border-2 border-dashed transition-colors ${card.key === focusedCardKey ? "bg-white/70" : "bg-white/35"} ${card.cardClass}`}
          style={box(card)}
        >
          <BorderLabel
            dot={{ className: card.colorClass }}
            centered={card.singleColumn}
            pinned={pinnedId === `group:${card.key}`}
            onToggle={() => onTogglePinned(`group:${card.key}`)}
          >
            {card.label}
          </BorderLabel>
        </div>
      ))}
      {phaseBands.map((band) => (
        <div
          key={band.phase}
          className="absolute rounded-2xl border-2"
          style={{ ...box(band), backgroundColor: band.color, borderColor: band.borderColor }}
        >
          <BorderLabel
            dot={{ color: band.borderColor }}
            centered={band.singleColumn}
            pinned={pinnedId === `phase:${band.phase}`}
            onToggle={() => onTogglePinned(`phase:${band.phase}`)}
          >
            Phase {band.phase}
          </BorderLabel>
        </div>
      ))}
      {eraBands.map((band) => (
        <div
          key={band.key}
          className="absolute inset-y-0 border-r border-dashed last:border-r-0"
          style={{ ...box(band), backgroundColor: band.color, borderColor: band.borderColor }}
        >
          <BorderLabel dot={{ color: band.borderColor }}>{band.label}</BorderLabel>
        </div>
      ))}
    </>
  );
}
