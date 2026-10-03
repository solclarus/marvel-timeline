import { SlidersHorizontal } from "lucide-react";

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

const GROUP_BY_LABEL: Record<GroupBy, string> = { franchise: "Franchise", earth: "Earth" };
// How far a selection's highlight reaches.
const FOCUS_MODE_LABEL: Record<FocusMode, string> = {
  chain: "All related",
  immediate: "Direct only",
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
            {(Object.keys(FOCUS_MODE_LABEL) as FocusMode[]).map((mode) => (
              <DropdownMenuRadioItem key={mode} value={mode} className="text-xs">
                {FOCUS_MODE_LABEL[mode]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Group by</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={grouping.by}
            onValueChange={(value: GroupBy) => onGroupByChange(value)}
          >
            {(Object.keys(GROUP_BY_LABEL) as GroupBy[]).map((by) => (
              <DropdownMenuRadioItem key={by} value={by} className="text-xs">
                {GROUP_BY_LABEL[by]}
              </DropdownMenuRadioItem>
            ))}
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
