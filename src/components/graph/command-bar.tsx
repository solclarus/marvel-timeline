import { useState } from "react";

import type { GroupBy, Grouping } from "@/lib/graph/groups";
import type { ViewMode } from "@/lib/graph/layout";
import type { MediaFilter } from "@/lib/graph/relations";
import type { Display } from "@/lib/url-state";
import { useWide } from "@/lib/use-wide";

import { AboutDialog } from "./about-dialog";
import { FabBar } from "./fab";
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

// Every map-wide control, three in all: search, the view (map or list, the
// order, posters or titles), and the menu (the viewer's own card; filters
// and lines; settings and About). At the bottom, within thumb reach, search
// stands apart from the other two; on wide screens search sits alone at
// the top right with the other two under it, clear of the sidebar card.
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
  const wide = useWide();
  const view = (
    <ViewMenu
      mode={mode}
      onModeChange={onModeChange}
      display={display}
      onDisplayChange={onDisplayChange}
      side={wide ? "left" : "top"}
    />
  );
  const menu = (
    <SettingsMenu
      media={media}
      onMediaChange={onMediaChange}
      grouping={grouping}
      onVisibleChange={onVisibleGroupsChange}
      onGroupByChange={onGroupByChange}
      onAbout={() => setAboutOpen(true)}
      onProgressOpen={onProgressOpen}
      side={wide ? "left" : "top"}
    />
  );
  const about = <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />;

  if (wide) {
    return (
      <div className="pointer-events-none fixed top-4 right-4 z-40 flex flex-col items-end gap-3">
        <FabBar from="top" className="pointer-events-auto w-80">
          <SearchBox onSelect={onSearchSelect} side="bottom" />
        </FabBar>
        <FabBar from="top" className="pointer-events-auto flex-col">
          {view}
          {menu}
        </FabBar>
        {about}
      </div>
    );
  }
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 flex justify-center gap-2 sm:bottom-6">
      <FabBar from="bottom" className="min-w-0 flex-1 sm:w-80 sm:flex-none">
        <SearchBox onSelect={onSearchSelect} side="top" />
      </FabBar>
      <FabBar from="bottom">
        {view}
        {menu}
      </FabBar>
      {about}
    </div>
  );
}
