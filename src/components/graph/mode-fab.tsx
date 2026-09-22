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

import { FabBar, fabMenuClass } from "./fab";

const MODES: Array<{ value: ViewMode; label: string; icon: typeof Route }> = [
  { value: "recommended", label: "ORDER", icon: Route },
  { value: "release", label: "RELEASE", icon: CalendarDays },
  { value: "chronology", label: "TIMELINE", icon: History },
];

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ModeFab({ mode, onChange }: Props) {
  const current = MODES.find((m) => m.value === mode)!;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <FabBar from="bottom">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="secondary" size="sm" className="rounded-full" />}
          >
            <current.icon className="size-4" />
            {current.label}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="center" sideOffset={14} className={fabMenuClass}>
            <DropdownMenuRadioGroup
              value={mode}
              onValueChange={(value: ViewMode) => onChange(value)}
            >
              {MODES.map((m) => (
                <DropdownMenuRadioItem
                  key={m.value}
                  value={m.value}
                  closeOnClick
                  className="text-xs"
                >
                  <m.icon className="size-4" />
                  {m.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </FabBar>
    </div>
  );
}
