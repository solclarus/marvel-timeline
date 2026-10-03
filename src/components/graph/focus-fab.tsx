import { Focus, GitBranch, Map, Waypoints } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DisplayMode } from "@/lib/graph/layout";
import type { FocusMode } from "@/lib/graph/relations";

import { FabBar, FabDivider } from "./fab";

interface Props {
  focusMode: FocusMode;
  onToggleFocusMode: () => void;
  displayMode: DisplayMode;
  onToggleDisplayMode: () => void;
}

export function FocusFab({
  focusMode,
  onToggleFocusMode,
  displayMode,
  onToggleDisplayMode,
}: Props) {
  return (
    <FabBar from="top" className="fixed top-6 right-6 z-50">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={onToggleFocusMode}
        aria-label={
          focusMode === "chain"
            ? "Highlighting the full chain. Switch to direct neighbors only"
            : "Highlighting direct neighbors only. Switch to the full chain"
        }
        title={focusMode === "chain" ? "ALL" : "ADJACENT"}
      >
        {focusMode === "chain" ? (
          <Waypoints className="size-4" />
        ) : (
          <GitBranch className="size-4" />
        )}
      </Button>
      <FabDivider />
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={onToggleDisplayMode}
        aria-label={
          displayMode === "inline"
            ? "Showing within the full map. Switch to a view of related works only"
            : "Showing related works only. Switch back to the full map"
        }
        title={displayMode === "inline" ? "MAP" : "FOCUS"}
      >
        {displayMode === "inline" ? <Map className="size-4" /> : <Focus className="size-4" />}
      </Button>
    </FabBar>
  );
}
