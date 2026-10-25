import type { GroupBy } from "@/lib/graph/groups";
import type {
  computeGroupCards,
  computePhaseBands,
  computeSagaBands,
  computeTimelineBackdrop,
} from "@/lib/graph/layout";
import { useI18n } from "@/lib/i18n";

import { BorderLabel } from "./border-label";

interface Props {
  groupBy: GroupBy;
  groupCards: ReturnType<typeof computeGroupCards>;
  phaseBands: ReturnType<typeof computePhaseBands>;
  sagaBands: ReturnType<typeof computeSagaBands>;
  timeline: ReturnType<typeof computeTimelineBackdrop>;
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
// saga frames and phase bands, and (in timeline modes) the decade bands,
// year rows, month columns and today's mark. The timelines' year and month
// labels float over the map instead (see TimelineLabels).
export function MapBackdrop({
  groupBy,
  groupCards,
  phaseBands,
  sagaBands,
  timeline,
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
          className={`absolute rounded-surface border-2 border-dashed transition-colors ${card.key === focusedCardKey ? "bg-white/10" : "bg-white/3"} ${card.cardClass}`}
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
          className="absolute rounded-surface border border-white/30 bg-white/2.5"
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
      {timeline?.decades.map((band, i) => (
        <div
          key={band.key}
          className={`absolute inset-x-0 border-dashed ${i > 0 ? "border-t" : ""}`}
          style={{
            top: `${band.top}%`,
            height: `${band.bottom - band.top}%`,
            backgroundColor: band.color,
            borderColor: band.borderColor,
          }}
        />
      ))}
      {/* Every other month a shade lighter, like a wall calendar's columns. */}
      {timeline?.months.map(
        (month, i) =>
          i % 2 === 1 && (
            <div
              key={month.month}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 bg-white/4"
              style={{ left: `${month.left}%`, width: `${month.right - month.left}%` }}
            />
          ),
      )}
      {timeline?.rows.slice(1).map((row) => (
        <div
          key={row.year}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-px bg-white/8"
          style={{ top: `${row.top}%` }}
        />
      ))}
      {timeline?.today && (
        <div
          aria-hidden
          className="pointer-events-none absolute w-0.5 -translate-x-1/2 rounded-full bg-sky-400"
          style={{
            left: `${timeline.today.x}%`,
            top: `${timeline.today.top}%`,
            height: `${timeline.today.bottom - timeline.today.top}%`,
          }}
        >
          <span className="absolute top-1 left-1.5 rounded-full bg-sky-400 px-1.5 text-[10px] font-semibold text-neutral-900">
            {t.today}
          </span>
        </div>
      )}
    </>
  );
}
