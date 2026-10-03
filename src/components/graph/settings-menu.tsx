import { Earth, GitBranch, Library, SlidersHorizontal, Waypoints } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GROUPS, type GroupBy, type Grouping } from "@/lib/graph/groups";
import type { FocusMode } from "@/lib/graph/relations";

import { fabMenuClass } from "./fab";

interface Props {
  grouping: Grouping;
  onToggle: (key: string) => void;
  onGroupByChange: (by: GroupBy) => void;
  focusMode: FocusMode;
  onFocusModeChange: (mode: FocusMode) => void;
}

const GROUP_BY_OPTIONS: Record<GroupBy, { label: string; icon: typeof Earth }> = {
  franchise: { label: "Franchise", icon: Library },
  earth: { label: "Earth", icon: Earth },
};
// How far a selection's highlight reaches.
const FOCUS_MODE_OPTIONS: Record<FocusMode, { label: string; icon: typeof Earth }> = {
  chain: { label: "All related", icon: Waypoints },
  immediate: { label: "Direct only", icon: GitBranch },
};

export function SettingsMenu({
  grouping,
  onToggle,
  onGroupByChange,
  focusMode,
  onFocusModeChange,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="View settings" />
        }
      >
        <SlidersHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" sideOffset={14} className={fabMenuClass}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Highlight</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={focusMode}
            onValueChange={(value: FocusMode) => onFocusModeChange(value)}
          >
            {(Object.keys(FOCUS_MODE_OPTIONS) as FocusMode[]).map((mode) => {
              const { label, icon: Icon } = FOCUS_MODE_OPTIONS[mode];
              return (
                <DropdownMenuRadioItem key={mode} value={mode} className="text-xs">
                  <Icon className="size-4" />
                  {label}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Group by</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={grouping.by}
            onValueChange={(value: GroupBy) => onGroupByChange(value)}
          >
            {(Object.keys(GROUP_BY_OPTIONS) as GroupBy[]).map((by) => {
              const { label, icon: Icon } = GROUP_BY_OPTIONS[by];
              return (
                <DropdownMenuRadioItem key={by} value={by} className="text-xs">
                  <Icon className="size-4" />
                  {label}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {GROUPS[grouping.by].map(({ key, label, colorClass }) => {
          const isVisible = grouping.visible.has(key);
          return (
            <DropdownMenuCheckboxItem
              key={key}
              checked={isVisible}
              onCheckedChange={() => onToggle(key)}
              disabled={isVisible && grouping.visible.size === 1}
              className="text-xs"
            >
              <span className={`size-2 shrink-0 rounded-full ${colorClass}`} />
              {label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
