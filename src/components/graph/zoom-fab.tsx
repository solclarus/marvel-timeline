import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";

import { FabBar, FabDivider } from "./fab";

interface Props {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function ZoomFab({ zoom, onZoomIn, onZoomOut, onFit }: Props) {
  return (
    // Desktop only: phones pinch to zoom.
    <FabBar from="bottom" className="fixed right-6 bottom-6 z-40 hidden flex-col md:flex">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={onZoomIn}
        aria-label="Zoom in"
      >
        <ZoomIn className="size-4" />
      </Button>
      <button
        type="button"
        onClick={onFit}
        className="w-10 rounded-full py-1 text-center text-[11px] text-muted-foreground tabular-nums hover:bg-muted hover:text-foreground"
        aria-label="Fit to view"
      >
        {Math.round(zoom * 100)}%
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={onZoomOut}
        aria-label="Zoom out"
      >
        <ZoomOut className="size-4" />
      </Button>
      <FabDivider vertical />
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={onFit}
        aria-label="Fit to view"
      >
        <Maximize2 className="size-4" />
      </Button>
    </FabBar>
  );
}
