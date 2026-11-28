import { Eye } from "lucide-react";

import { cn } from "@/lib/utils";

// The eye on a watched work: a poster's or tile's corner, or a row's end.
export function WatchedMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "z-10 flex size-4.5 items-center justify-center rounded-full bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      <Eye className="size-3" strokeWidth={2.75} />
    </span>
  );
}
