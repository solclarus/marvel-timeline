import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

import { FabBar, FabDivider } from "./fab";

interface Props {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

// Scales are floats, so "at the limit" allows a little slack.
const EPSILON = 0.001;

export function ZoomFab({ zoom, minZoom, maxZoom, onZoomIn, onZoomOut, onFit }: Props) {
  const { t } = useI18n();
  return (
    // Desktop only: phones pinch to zoom. Top-right, out of the way of the
    // command bar.
    <FabBar from="top" className="fixed top-6 right-6 z-40 hidden flex-col md:flex">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={onZoomIn}
        disabled={zoom >= maxZoom - EPSILON}
        aria-label={t.zoomIn}
      >
        <ZoomIn className="size-4" />
      </Button>
      <button
        type="button"
        onClick={onFit}
        className="w-10 rounded-full py-1 text-center text-[11px] text-muted-foreground tabular-nums hover:bg-muted hover:text-foreground"
        aria-label={t.fitToView}
      >
        {Math.round(zoom * 100)}%
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={onZoomOut}
        disabled={zoom <= minZoom + EPSILON}
        aria-label={t.zoomOut}
      >
        <ZoomOut className="size-4" />
      </Button>
      <FabDivider vertical />
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={onFit}
        aria-label={t.fitToView}
      >
        <Maximize2 className="size-4" />
      </Button>
    </FabBar>
  );
}
