import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";

interface Props {
  label: string;
  // A Tailwind class for groups, an inline color for phase bands.
  dot: { className?: string; color?: string };
  count: number;
  // Where the pointer was when the card got focus, until it moves again.
  initial: { x: number; y: number };
}

// Follows the pointer while a group card or phase band is focused. Tracks
// the pointer itself so the map doesn't re-render on every move, and hides
// over posters, which show their own tooltip.
export function GroupHoverChip({ label, dot, count, initial }: Props) {
  const { t } = useI18n();
  const [pointer, setPointer] = useState({ ...initial, overPoster: false });

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const overPoster =
        event.target instanceof Element &&
        event.target.closest("[data-slot=tooltip-trigger]") !== null;
      setPointer({ x: event.clientX, y: event.clientY, overPoster });
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  if (pointer.overPoster) return null;
  return (
    <div
      className="pointer-events-none fixed z-50 flex items-center gap-1.5 rounded-full border bg-card/95 px-3 py-1.5 text-xs whitespace-nowrap text-card-foreground shadow-xl shadow-black/30 backdrop-blur-md"
      style={{ left: pointer.x + 14, top: pointer.y + 14 }}
    >
      <span
        className={`size-2 rounded-full ${dot.className ?? ""}`}
        style={{ backgroundColor: dot.color }}
      />
      <span className="font-semibold">{label}</span>
      <span className="text-muted-foreground">{t.workCount(count)}</span>
    </div>
  );
}
