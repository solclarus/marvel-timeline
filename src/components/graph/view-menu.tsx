import { CalendarDays, History, Image, List, Map, Route, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ViewMode } from "@/lib/graph/layout";
import type { NodeArt } from "@/lib/graph/metrics";
import { useI18n, type Messages } from "@/lib/i18n";
import { useNodeArt } from "@/lib/node-art";
import type { Display } from "@/lib/url-state";

import { fabMenuClass } from "./fab";

const MODES: Array<{ value: ViewMode; label: keyof Messages; icon: typeof Route }> = [
  { value: "recommended", label: "modeRecommended", icon: Route },
  { value: "release", label: "modeRelease", icon: CalendarDays },
  { value: "chronology", label: "modeChronology", icon: History },
];

const ARTS: Array<{ value: NodeArt; label: keyof Messages; icon: typeof Route }> = [
  { value: "poster", label: "artPoster", icon: Image },
  { value: "logo", label: "artLogo", icon: Type },
];

const DISPLAYS: Array<{ value: Display; label: keyof Messages; icon: typeof Route }> = [
  { value: "map", label: "displayMap", icon: Map },
  { value: "list", label: "displayList", icon: List },
];

interface Props {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  display: Display;
  onDisplayChange: (display: Display) => void;
}

// How the works are shown: as a map or a list, in which order, and as
// posters or title logos. One menu, so the bar keeps a single button.
export function ViewMenu({ mode, onModeChange, display, onDisplayChange }: Props) {
  const { t } = useI18n();
  const current = MODES.find((m) => m.value === mode)!;
  const shown = DISPLAYS.find((d) => d.value === display)!;
  const label = (key: keyof Messages) => t[key] as string;
  const [art, setArt] = useNodeArt();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" />}
        aria-label={t.viewLabel(`${label(shown.label)} · ${label(current.label)}`)}
        title={`${label(shown.label)} · ${label(current.label)}`}
      >
        <shown.icon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={14} className={fabMenuClass}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.displayLabel}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={display}
            onValueChange={(value: Display) => onDisplayChange(value)}
          >
            {DISPLAYS.map((d) => (
              <DropdownMenuRadioItem key={d.value} value={d.value} closeOnClick className="text-xs">
                <d.icon className="size-4" />
                {label(d.label)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.orderLabel}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={mode}
            onValueChange={(value: ViewMode) => onModeChange(value)}
          >
            {MODES.map((m) => (
              <DropdownMenuRadioItem key={m.value} value={m.value} closeOnClick className="text-xs">
                <m.icon className="size-4" />
                {label(m.label)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.nodeArt}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={art} onValueChange={(value: NodeArt) => setArt(value)}>
            {ARTS.map((a) => (
              <DropdownMenuRadioItem key={a.value} value={a.value} closeOnClick className="text-xs">
                <a.icon className="size-4" />
                {label(a.label)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
