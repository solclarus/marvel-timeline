import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { posterUrl, type WorkNode } from "@/data/works";
import { useI18n } from "@/lib/i18n";

// A skeleton while loading; if TMDB can't serve the image, the title in its
// place so the poster stays identifiable.
export function PosterThumb({ work }: { work: WorkNode }) {
  const { titleOf } = useI18n();
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");

  if (status === "failed") {
    return (
      <div
        data-poster-fallback
        className="absolute inset-0 flex items-center justify-center bg-stone-700 p-1 text-center text-[9px] leading-tight font-semibold text-stone-100"
      >
        <span className="line-clamp-5">{titleOf(work)}</span>
      </div>
    );
  }
  return (
    <>
      {status === "loading" && (
        <Skeleton className="absolute inset-0 rounded-none bg-stone-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.25)]" />
      )}
      <img
        src={posterUrl(work)}
        alt=""
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("failed")}
      />
    </>
  );
}
