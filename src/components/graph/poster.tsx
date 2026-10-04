import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { FRANCHISE_META, mediumOf, posterUrl, type WorkNode } from "@/data/works";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { MEDIUM_META } from "./medium-badge";

// Stand-in art for a work with no poster yet (or one TMDB can't serve): a
// dark card lit in its franchise's color, with its kind, title and year.
// `compact` drops the text for thumbnails too small to read it.
function PosterArt({ work, compact = false }: { work: WorkNode; compact?: boolean }) {
  const { titleOf } = useI18n();
  const Icon = MEDIUM_META[mediumOf(work)].icon;
  // "X-Men '97 — Season 3": the season on its own line.
  const [title, season] = titleOf(work).split(" — ");
  return (
    <div
      data-poster-fallback
      className="@container absolute inset-0 overflow-hidden bg-linear-to-b from-neutral-800 to-neutral-950 text-white"
    >
      {/* A soft glow and a thin rule in the franchise color. */}
      <div
        className={cn(
          "absolute -top-1/4 left-1/2 size-[140%] -translate-x-1/2 rounded-full opacity-35 blur-2xl",
          FRANCHISE_META[work.franchise].colorClass,
        )}
      />
      <div
        className={cn("absolute inset-x-0 top-0 h-0.75", FRANCHISE_META[work.franchise].colorClass)}
      />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(255,255,255,0.03)_6px_7px)]" />
      <div className="relative flex size-full flex-col items-center justify-between p-[8%] text-center">
        <Icon
          className={cn(
            "shrink-0 opacity-70",
            compact ? "my-auto  size-1/2" : "size-[18%] min-w-3",
          )}
          aria-hidden
        />
        {!compact && (
          <>
            <span className="flex flex-col items-center gap-[0.3em]">
              <span className="line-clamp-3 text-[clamp(7px,12cqw,16px)] leading-tight font-bold tracking-tight">
                {title}
              </span>
              {season && (
                <span className="text-[clamp(6px,9cqw,12px)] font-medium text-white/75">
                  {season}
                </span>
              )}
            </span>
            <span className="text-[clamp(6px,8cqw,11px)] font-medium text-white/60 tabular-nums">
              {work.releaseDate.slice(0, 4)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// A work's poster at any size, falling back to `PosterArt`. The parent sets
// the size (and corner radius) and must be positioned.
export function Poster({
  work,
  compact = false,
  loading = "lazy",
}: {
  work: WorkNode;
  compact?: boolean;
  loading?: "lazy" | "eager";
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(
    work.poster ? "loading" : "failed",
  );
  if (status === "failed") return <PosterArt work={work} compact={compact} />;
  return (
    <>
      {status === "loading" && (
        <Skeleton className="absolute inset-0 rounded-none bg-neutral-700 shadow-[inset_0_0_10px_rgba(0,0,0,0.4)]" />
      )}
      <img
        src={posterUrl(work, compact ? "w154" : "w185")}
        alt=""
        loading={loading}
        decoding="async"
        className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("failed")}
      />
    </>
  );
}
