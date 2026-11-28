import { useState } from "react";

import { LOGOS } from "@/data/logos";
import { FRANCHISE_META, type WorkNode } from "@/data/works";
import { cn } from "@/lib/utils";

// Logos are cut out for any background, and many are black. Each one's ink
// is measured once it loads; a dark one is drawn white, so it reads on the
// dark tile. Kept per work across renders and layouts.
const inkIsDark = new Map<string, boolean>();

function measureInk(img: HTMLImageElement): boolean {
  const width = 48;
  // An SVG may have no size of its own.
  const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1 / 3;
  const height = Math.max(1, Math.round(width * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  context.drawImage(img, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  let ink = 0;
  let light = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    if (alpha < 0.2) continue;
    // Relative luminance, near enough.
    const luminance = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    ink += alpha;
    light += luminance * alpha;
  }
  return ink > 0 && light / ink < 0.35;
}

export function logoUrl(path: string) {
  return `https://image.tmdb.org/t/p/w300${path}`;
}

// A work's English title logo on a dark tile lit in its franchise's color;
// its title in type when TMDB has no logo. The parent sets the size and must
// be positioned.
export function Logo({ work }: { work: WorkNode }) {
  const path = LOGOS[work.id];
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(
    path ? "loading" : "failed",
  );
  const [dark, setDark] = useState(() => inkIsDark.get(work.id));

  return (
    <div className="absolute inset-0 overflow-hidden bg-linear-to-b from-neutral-800 to-neutral-950">
      <div
        className={cn(
          "absolute -top-1/2 left-1/2 size-full -translate-x-1/2 rounded-full opacity-25 blur-xl",
          FRANCHISE_META[work.franchise].colorClass,
        )}
      />
      {status === "failed" ? (
        <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs/tight font-bold text-balance text-white">
          <span className="line-clamp-3">{work.title}</span>
        </span>
      ) : (
        <img
          src={logoUrl(path!)}
          alt=""
          crossOrigin="anonymous"
          loading="lazy"
          decoding="async"
          onLoad={(e) => {
            if (dark === undefined) {
              let measured = false;
              try {
                measured = measureInk(e.currentTarget);
              } catch {
                // A tainted canvas: draw it as it is.
              }
              inkIsDark.set(work.id, measured);
              setDark(measured);
            }
            setStatus("loaded");
          }}
          onError={() => setStatus("failed")}
          className={cn(
            "absolute inset-[12%] size-[76%] object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] transition-opacity duration-300",
            dark && "brightness-0 invert",
            status === "loaded" ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
