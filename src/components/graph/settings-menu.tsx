import { Earth, GitBranch, Languages, Library, SlidersHorizontal, Waypoints } from "lucide-react";

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
import { LOCALE_NAMES, LOCALES, useI18n, type Locale, type Messages } from "@/lib/i18n";

import { fabMenuClass } from "./fab";
import { EDGE_STYLE, type EdgeStyle } from "./graph-edges";

interface Props {
  grouping: Grouping;
  onToggle: (key: string) => void;
  onGroupByChange: (by: GroupBy) => void;
  focusMode: FocusMode;
  onFocusModeChange: (mode: FocusMode) => void;
}

// What each of the map's three line styles means.
type MessageKey = { [K in keyof Messages]: Messages[K] extends string ? K : never }[keyof Messages];

const EDGE_LEGEND: Array<{ style: EdgeStyle; label: MessageKey; detail?: MessageKey }> = [
  { style: "prerequisite", label: "linePrerequisite", detail: "linePrerequisiteDetail" },
  { style: "reference", label: "lineReference", detail: "lineReferenceDetail" },
];

function LineSample({ style }: { style: EdgeStyle }) {
  const { stroke, width, dash } = EDGE_STYLE[style];
  return (
    <svg width="24" height="8" aria-hidden className="shrink-0">
      <line
        x1="1"
        y1="4"
        x2="23"
        y2="4"
        stroke={stroke}
        strokeWidth={width * 0.6}
        strokeDasharray={dash ? "3 3" : undefined}
        strokeLinecap="round"
      />
    </svg>
  );
}

const GROUP_BY_OPTIONS: Record<GroupBy, { label: MessageKey; icon: typeof Earth }> = {
  franchise: { label: "franchise", icon: Library },
  earth: { label: "earth", icon: Earth },
};
// How far a selection's highlight reaches.
const FOCUS_MODE_OPTIONS: Record<FocusMode, { label: MessageKey; icon: typeof Earth }> = {
  chain: { label: "allRelated", icon: Waypoints },
  immediate: { label: "directOnly", icon: GitBranch },
};

export function SettingsMenu({
  grouping,
  onToggle,
  onGroupByChange,
  focusMode,
  onFocusModeChange,
}: Props) {
  const { t, locale, setLocale, groupLabel } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={t.viewSettings}
          />
        }
      >
        <SlidersHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" sideOffset={14} className={fabMenuClass}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.highlight}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={focusMode}
            onValueChange={(value: FocusMode) => onFocusModeChange(value)}
          >
            {(Object.keys(FOCUS_MODE_OPTIONS) as FocusMode[]).map((mode) => {
              const { label, icon: Icon } = FOCUS_MODE_OPTIONS[mode];
              return (
                <DropdownMenuRadioItem key={mode} value={mode} className="text-xs">
                  <Icon className="size-4" />
                  {t[label]}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.groupBy}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={grouping.by}
            onValueChange={(value: GroupBy) => onGroupByChange(value)}
          >
            {(Object.keys(GROUP_BY_OPTIONS) as GroupBy[]).map((by) => {
              const { label, icon: Icon } = GROUP_BY_OPTIONS[by];
              return (
                <DropdownMenuRadioItem key={by} value={by} className="text-xs">
                  <Icon className="size-4" />
                  {t[label]}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {GROUPS[grouping.by].map(({ key, colorClass }) => {
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
              {groupLabel(grouping.by, key)}
            </DropdownMenuCheckboxItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.language}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(value: Locale) => setLocale(value)}
          >
            {LOCALES.map((option) => (
              <DropdownMenuRadioItem key={option} value={option} className="text-xs" lang={option}>
                <Languages className="size-4" />
                {LOCALE_NAMES[option]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.lines}</DropdownMenuLabel>
          {EDGE_LEGEND.map(({ style, label, detail }) => (
            <div key={style} className="flex items-center gap-2 px-1.5 py-1 text-xs">
              <LineSample style={style} />
              <span>
                {t[label]}
                {detail && <span className="text-muted-foreground"> · {t[detail]}</span>}
              </span>
            </div>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
