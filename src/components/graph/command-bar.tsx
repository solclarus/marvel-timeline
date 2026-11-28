import { useState } from "react";

import type { GroupBy, Grouping } from "@/lib/graph/groups";
import type { ViewMode } from "@/lib/graph/layout";
import type { MediaFilter } from "@/lib/graph/relations";
import type { Display } from "@/lib/url-state";

import { AboutDialog } from "./about-dialog";
import { FabBar, FabDivider } from "./fab";
import { SearchBox } from "./search-box";
import { SettingsMenu } from "./settings-menu";
import { ViewMenu } from "./view-menu";

interface Props {
  display: Display;
  onDisplayChange: (display: Display) => void;
  onProgressOpen: () => void;
  onSearchSelect: (id: string) => void;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  media: MediaFilter;
  onMediaChange: (media: MediaFilter) => void;
  grouping: Grouping;
  onVisibleGroupsChange: (visible: Set<string>) => void;
  onGroupByChange: (by: GroupBy) => void;
}

// Every map-wide control in one bar, three in all: search, the view (map or
// list, and the order), and the menu (the viewer's own card; filters and
// display; About). At the bottom, within thumb
// reach; full width on phones.
export function CommandBar({
  display,
  onDisplayChange,
  onProgressOpen,
  onSearchSelect,
  mode,
  onModeChange,
  media,
  onMediaChange,
  grouping,
  onVisibleGroupsChange,
  onGroupByChange,
}: Props) {
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 flex justify-center sm:bottom-6">
      <FabBar from="bottom" className="w-full sm:w-auto">
        <SearchBox onSelect={onSearchSelect} />
        <FabDivider />
        <ViewMenu
          mode={mode}
          onModeChange={onModeChange}
          display={display}
          onDisplayChange={onDisplayChange}
        />
        <SettingsMenu
          media={media}
          onMediaChange={onMediaChange}
          grouping={grouping}
          onVisibleChange={onVisibleGroupsChange}
          onGroupByChange={onGroupByChange}
          onAbout={() => setAboutOpen(true)}
          onProgressOpen={onProgressOpen}
        />
      </FabBar>
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}
