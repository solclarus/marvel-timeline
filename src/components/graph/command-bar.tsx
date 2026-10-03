import { Clapperboard, Film } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GroupBy, Grouping } from "@/lib/graph/groups";
import type { ViewMode } from "@/lib/graph/layout";
import type { FocusMode, MediaFilter } from "@/lib/graph/relations";

import { AboutDialog } from "./about-dialog";
import { FabBar, FabDivider } from "./fab";
import { ModeMenu } from "./mode-menu";
import { SearchBox } from "./search-box";
import { SettingsMenu } from "./settings-menu";

interface Props {
  onSearchSelect: (id: string) => void;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  media: MediaFilter;
  onMediaChange: (media: MediaFilter) => void;
  grouping: Grouping;
  onToggleGroup: (key: string) => void;
  onGroupByChange: (by: GroupBy) => void;
  focusMode: FocusMode;
  onFocusModeChange: (mode: FocusMode) => void;
}

// Every map-wide control in one bar: search, view mode, media filter, and
// the highlight/grouping/visibility settings. At the bottom, within thumb
// reach; full width on phones.
export function CommandBar({
  onSearchSelect,
  mode,
  onModeChange,
  media,
  onMediaChange,
  grouping,
  onToggleGroup,
  onGroupByChange,
  focusMode,
  onFocusModeChange,
}: Props) {
  const moviesOnly = media === "movies";
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 flex justify-center sm:bottom-6">
      <FabBar from="bottom" className="w-full sm:w-auto">
        <SearchBox onSelect={onSearchSelect} />
        <FabDivider />
        <ModeMenu mode={mode} onChange={onModeChange} />
        <Button
          variant={moviesOnly ? "secondary" : "ghost"}
          size="sm"
          className="rounded-full"
          onClick={() => onMediaChange(moviesOnly ? "all" : "movies")}
          aria-pressed={moviesOnly}
          aria-label={
            moviesOnly
              ? "Showing films only. Show series too"
              : "Showing films and series. Show films only"
          }
          title={moviesOnly ? "Films only" : "Films and series"}
        >
          {moviesOnly ? <Film className="size-4" /> : <Clapperboard className="size-4" />}
          <span className="hidden sm:inline">{moviesOnly ? "MOVIES" : "ALL"}</span>
        </Button>
        <SettingsMenu
          grouping={grouping}
          onToggle={onToggleGroup}
          onGroupByChange={onGroupByChange}
          focusMode={focusMode}
          onFocusModeChange={onFocusModeChange}
        />
        <AboutDialog />
      </FabBar>
    </div>
  );
}
