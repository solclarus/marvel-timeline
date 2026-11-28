import * as m from "motion/react-m";

import { useI18n } from "@/lib/i18n";

// What to do with the works picked in the list: mark them watched or not.
// Floats above the command bar while picking.
export function SelectionBar({
  count,
  onMark,
  onUnmark,
  onDone,
}: {
  count: number;
  onMark: () => void;
  onUnmark: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const action =
    "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40";
  return (
    <m.div
      role="toolbar"
      aria-label={t.selectedCount(count)}
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-md items-center gap-1 rounded-full border border-tint/10 bg-card/95 py-1.5 pr-1.5 pl-4 shadow-2xl shadow-black/15 backdrop-blur-xl sm:bottom-28 lg:bottom-6 dark:shadow-black/50"
    >
      <output className="flex-1 truncate text-xs text-muted-foreground tabular-nums">
        {t.selectedCount(count)}
      </output>
      <button
        type="button"
        onClick={onUnmark}
        disabled={count === 0}
        className={`${action} text-foreground/85 hover:bg-tint/10`}
      >
        {t.unmarkSelected}
      </button>
      <button
        type="button"
        onClick={onMark}
        disabled={count === 0}
        className={`${action} bg-marquee text-background hover:bg-marquee/90`}
      >
        {t.markSelected}
      </button>
      <button
        type="button"
        onClick={onDone}
        className={`${action} text-muted-foreground hover:bg-tint/10`}
      >
        {t.selectDone}
      </button>
    </m.div>
  );
}
