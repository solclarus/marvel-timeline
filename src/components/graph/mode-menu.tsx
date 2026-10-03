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
import { useI18n, type Messages } from "@/lib/i18n";

import { fabMenuClass } from "./fab";

const MODES: Array<{ value: ViewMode; label: keyof Messages; icon: typeof Route }> = [
  { value: "recommended", label: "modeRecommended", icon: Route },
  { value: "release", label: "modeRelease", icon: CalendarDays },
  { value: "chronology", label: "modeChronology", icon: History },
];

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ModeMenu({ mode, onChange }: Props) {
  const { t } = useI18n();
  const current = MODES.find((m) => m.value === mode)!;
  const label = (key: keyof Messages) => t[key] as string;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="secondary" size="sm" className="rounded-full" />}
        aria-label={t.viewLabel(label(current.label))}
      >
        <current.icon className="size-4" />
        <span className="hidden sm:inline">{label(current.label)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={14} className={fabMenuClass}>
        <DropdownMenuRadioGroup value={mode} onValueChange={(value: ViewMode) => onChange(value)}>
          {MODES.map((m) => (
            <DropdownMenuRadioItem key={m.value} value={m.value} closeOnClick className="text-xs">
              <m.icon className="size-4" />
              {label(m.label)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
