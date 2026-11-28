import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// The check on a watched work's poster or tile.
export function WatchedMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "z-10 flex size-4.5 items-center justify-center rounded-full bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
  );
}
