import { useEffect, useRef } from "react";
import { useTransformContext } from "react-zoom-pan-pinch";

import type { TimelineGrid } from "@/lib/graph/layout";
import { useI18n } from "@/lib/i18n";

const LABEL_CLASS =
  "absolute rounded-full bg-card/90 px-2 py-0.5 text-xs font-semibold text-card-foreground tabular-nums shadow-md shadow-black/20 whitespace-nowrap";

// A timeline's year labels (left) and month labels (top), kept on screen
// while the map pans, at a size that reads at any zoom. They sit over the
// map rather than in it; the map's transform reaches them as CSS variables,
// so panning doesn't re-render them.
export function TimelineLabels({
  grid,
  canvas,
}: {
  grid: TimelineGrid;
  canvas: { width: number; height: number };
}) {
  const { t, locale } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const zoom = useTransformContext();

  useEffect(() => {
    const apply = ({ positionX, positionY, scale }: typeof zoom.state) => {
      const style = ref.current?.style;
      style?.setProperty("--tx", `${positionX}px`);
      style?.setProperty("--ty", `${positionY}px`);
      style?.setProperty("--s", String(scale));
    };
    apply(zoom.state);
    return zoom.onChange((context) => apply(context.instance.state));
  }, [zoom]);

  // Canvas pixels to screen pixels, along each axis.
  const screenX = (px: number) => `calc(var(--tx) + ${px}px * var(--s))`;
  const screenY = (px: number) => `calc(var(--ty) + ${px}px * var(--s))`;
  const monthName = new Intl.DateTimeFormat(locale, { month: "short" });

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={{ "--tx": "0px", "--ty": "0px", "--s": "1" } as React.CSSProperties}
    >
      {grid.months.map((month) => (
        <span
          key={month.month}
          className={`${LABEL_CLASS} -translate-1/2`}
          style={{
            left: screenX((((month.left + month.right) / 2) * canvas.width) / 100),
            // Just above the map while there's room, else along the top.
            top: `max(16px, ${screenY(0)} - 14px)`,
          }}
        >
          {month.month === 12 ? t.yearOnly : monthName.format(new Date(2000, month.month, 1))}
        </span>
      ))}
      {grid.rows.map((row) => (
        <span
          key={row.year}
          className={`${LABEL_CLASS} -translate-x-full -translate-y-1/2`}
          style={{
            // Just left of the map while there's room, else along the left
            // edge (its right end clear of the first column at most zooms).
            left: `max(56px, ${screenX(0)} - 4px)`,
            top: screenY((((row.top + row.bottom) / 2) * canvas.height) / 100),
          }}
        >
          {row.year}
        </span>
      ))}
    </div>
  );
}
