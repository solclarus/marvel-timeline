import type { WorkNode } from "@/data/works";
import { useI18n } from "@/lib/i18n";
import { runtimeOf, totalRuntime as totalRuntimeOf } from "@/lib/runtime";

import { Poster } from "./poster";

// Numbered works to watch in order; picking one selects it on the map.
export function WatchList({
  items,
  onSelect,
}: {
  items: Array<{ work: WorkNode; direct?: boolean }>;
  onSelect: (id: string) => void;
}) {
  const { t, titleOf } = useI18n();
  return (
    <ol className="-mx-2 mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto px-2">
      {items.map(({ work, direct }, i) => {
        const runtime = runtimeOf(work);
        return (
          <li key={work.id}>
            <button
              type="button"
              onClick={() => onSelect(work.id)}
              className="flex w-full items-center gap-3 rounded-item px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <span className="relative block h-12 w-8 shrink-0 overflow-hidden rounded-thumb bg-muted">
                <Poster key={work.id} work={work} compact />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{titleOf(work)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {work.releaseDate.slice(0, 4)}
                  {runtime && ` · ${t.duration(runtime.minutes)}`}
                </span>
              </span>
              {direct && (
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {t.directTag}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// "22 works, in order · 41h 20m in all" style counts above a list.
export function ListTotals({ works, label }: { works: WorkNode[]; label: string }) {
  const { t } = useI18n();
  const { minutes, missing } = totalRuntimeOf(works);
  return (
    <span className="font-normal tracking-normal normal-case">
      {label}
      {minutes > 0 && ` · ${t.totalTime(t.duration(minutes), missing)}`}
    </span>
  );
}
