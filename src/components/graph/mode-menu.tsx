import { CalendarDays, History, Route } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ViewMode } from "@/lib/graph/layout";

import { fabMenuClass } from "./fab";

const MODES: Array<{ value: ViewMode; label: string; icon: typeof Route }> = [
  { value: "recommended", label: "ORDER", icon: Route },
  { value: "release", label: "RELEASE", icon: CalendarDays },
  { value: "chronology", label: "TIMELINE", icon: History },
];

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ModeMenu({ mode, onChange }: Props) {
  const current = MODES.find((m) => m.value === mode)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="secondary" size="sm" className="rounded-full" />}
        aria-label={`View: ${current.label}`}
      >
        <current.icon className="size-4" />
        <span className="hidden sm:inline">{current.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="center" sideOffset={14} className={fabMenuClass}>
        <DropdownMenuRadioGroup value={mode} onValueChange={(value: ViewMode) => onChange(value)}>
          {MODES.map((m) => (
            <DropdownMenuRadioItem key={m.value} value={m.value} closeOnClick className="text-xs">
              <m.icon className="size-4" />
              {m.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
