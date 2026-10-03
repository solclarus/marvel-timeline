import type { GroupBy } from "@/lib/graph/groups";
import type {
  computeEraBands,
  computeGroupCards,
  computePhaseBands,
  computeSagaBands,
  computeYearMarks,
} from "@/lib/graph/layout";
import { useI18n } from "@/lib/i18n";

import { BorderLabel } from "./border-label";

interface Props {
  groupBy: GroupBy;
  groupCards: ReturnType<typeof computeGroupCards>;
  phaseBands: ReturnType<typeof computePhaseBands>;
  sagaBands: ReturnType<typeof computeSagaBands>;
  eraBands: ReturnType<typeof computeEraBands>;
  yearMarks: ReturnType<typeof computeYearMarks>;
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
// saga frames and phase bands, and (in timeline modes) decade bands, each with its label.
export function MapBackdrop({
  groupBy,
  groupCards,
  phaseBands,
  sagaBands,
  eraBands,
  yearMarks,
  focusedCardKey,
  pinnedId,
  onTogglePinned,
}: Props) {
  const { t, groupLabel } = useI18n();
  return (
    <>
      {groupCards.map((card) => (
        <div
          key={card.key}
          className={`absolute rounded-surface border-2 border-dashed transition-colors ${card.key === focusedCardKey ? "bg-white/10" : "bg-white/[0.03]"} ${card.cardClass}`}
          style={box(card)}
        >
          <BorderLabel
            dot={{ className: card.colorClass }}
            centered={card.singleColumn}
            pinned={pinnedId === `group:${card.key}`}
            onToggle={() => onTogglePinned(`group:${card.key}`)}
          >
            {groupLabel(groupBy, card.key)}
          </BorderLabel>
        </div>
      ))}
      {sagaBands.map((band) => (
        <div
          key={band.saga}
          className="absolute rounded-surface border border-white/30 bg-white/[0.025]"
          style={box(band)}
        >
          <BorderLabel dot={{ className: "bg-white/70" }}>{t.saga(band.saga)}</BorderLabel>
        </div>
      ))}
      {phaseBands.map((band) => (
        <div
          key={band.phase}
          className="absolute rounded-surface border-2"
          style={{ ...box(band), backgroundColor: band.color, borderColor: band.borderColor }}
        >
          <BorderLabel
            dot={{ color: band.borderColor }}
            centered={band.singleColumn}
            pinned={pinnedId === `phase:${band.phase}`}
            onToggle={() => onTogglePinned(`phase:${band.phase}`)}
          >
            {t.phase(band.phase)}
          </BorderLabel>
        </div>
      ))}
      {eraBands.map((band) => (
        <div
          key={band.key}
          className="absolute inset-y-0 border-r border-dashed last:border-r-0"
          style={{ ...box(band), backgroundColor: band.color, borderColor: band.borderColor }}
        >
          {/* In the header strip above the rows, clear of the group labels. */}
          <div className="absolute inset-x-0 top-5">
            <BorderLabel dot={{ color: band.borderColor }}>{t.decade(band.decade)}</BorderLabel>
          </div>
        </div>
      ))}
      {yearMarks.map((mark) => (
        <div
          key={mark.key}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-px bg-white/10"
          style={{ left: `${mark.x}%` }}
        >
          <span className="absolute top-1 left-1 text-[10px] font-medium text-white/40 tabular-nums">
            {mark.year}
          </span>
        </div>
      ))}
    </>
  );
}
