import { List, Map } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GroupBy, Grouping } from "@/lib/graph/groups";
import type { ViewMode } from "@/lib/graph/layout";
import type { FocusMode, MediaFilter } from "@/lib/graph/relations";
import { useI18n } from "@/lib/i18n";
import type { Display } from "@/lib/url-state";

import { AboutDialog } from "./about-dialog";
import { FabBar, FabDivider } from "./fab";
import { ModeMenu } from "./mode-menu";
import { RoutesDialog } from "./routes-dialog";
import { SearchBox } from "./search-box";
import { SettingsMenu } from "./settings-menu";

interface Props {
  display: Display;
  onDisplayChange: (display: Display) => void;
  onRouteSelect: (id: string) => void;
  onSearchSelect: (id: string) => void;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  media: MediaFilter;
  onMediaChange: (media: MediaFilter) => void;
  grouping: Grouping;
  onVisibleGroupsChange: (visible: Set<string>) => void;
  onGroupByChange: (by: GroupBy) => void;
  focusMode: FocusMode;
  onFocusModeChange: (mode: FocusMode) => void;
}

// Every map-wide control in one bar: search, view mode, and the settings
// panel (filters, highlight, grouping, language). At the bottom, within thumb
// reach; full width on phones.
export function CommandBar({
  display,
  onDisplayChange,
  onRouteSelect,
  onSearchSelect,
  mode,
  onModeChange,
  media,
  onMediaChange,
  grouping,
  onVisibleGroupsChange,
  onGroupByChange,
  focusMode,
  onFocusModeChange,
}: Props) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 flex justify-center sm:bottom-6">
      <FabBar from="bottom" className="w-full sm:w-auto">
        <SearchBox onSelect={onSearchSelect} />
        <FabDivider />
        <ModeMenu mode={mode} onChange={onModeChange} />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDisplayChange(display === "map" ? "list" : "map")}
          aria-label={display === "map" ? t.showList : t.showMap}
          title={display === "map" ? t.showList : t.showMap}
        >
          {display === "map" ? <List className="size-4" /> : <Map className="size-4" />}
        </Button>
        <RoutesDialog onSelect={onRouteSelect} />
        <SettingsMenu
          media={media}
          onMediaChange={onMediaChange}
          grouping={grouping}
          onVisibleChange={onVisibleGroupsChange}
          onGroupByChange={onGroupByChange}
          focusMode={focusMode}
          onFocusModeChange={onFocusModeChange}
        />
        <AboutDialog />
      </FabBar>
    </div>
  );
}
