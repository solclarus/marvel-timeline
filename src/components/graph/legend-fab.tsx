import { Info, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GROUPS, type GroupBy, type Grouping } from "@/lib/graph/groups";

import { fabMenuClass } from "./fab";

interface Props {
  grouping: Grouping;
  onToggle: (key: string) => void;
  onGroupByChange: (by: GroupBy) => void;
  watchedCount: number;
  onClearWatched: () => void;
}

const GROUP_BY_LABEL: Record<GroupBy, string> = { franchise: "Franchise", earth: "Earth" };

export function LegendFab({
  grouping,
  onToggle,
  onGroupByChange,
  watchedCount,
  onClearWatched,
}: Props) {
  return (
    <div className="fixed right-6 bottom-6 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="secondary"
              size="icon"
              className="size-10 rounded-full border border-border/60 bg-card/95 shadow-xl shadow-black/20 backdrop-blur-md"
              aria-label="Groups"
            />
          }
        >
          <Info className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" sideOffset={8} className={fabMenuClass}>
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
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={watchedCount === 0}
            onClick={() => {
              if (window.confirm(`Clear all ${watchedCount} watched works?`)) onClearWatched();
            }}
            className="text-xs"
          >
            <RotateCcw />
            Clear watched ({watchedCount})
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
