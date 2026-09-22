import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { posterUrl, type WorkNode } from "@/data/works";

export function PosterThumb({ work }: { work: WorkNode }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <Skeleton className="absolute inset-0 rounded-none bg-stone-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.25)]" />
      )}
      <img
        src={posterUrl(work)}
        alt=""
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}
