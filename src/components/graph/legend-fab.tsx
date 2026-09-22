import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FRANCHISE_META, type Franchise } from "@/data/works";

import { fabMenuClass } from "./fab";

interface Props {
  visibleFranchises: Set<Franchise>;
  onToggle: (franchise: Franchise) => void;
}

export function LegendFab({ visibleFranchises, onToggle }: Props) {
  return (
    <div className="fixed right-6 bottom-6 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="secondary"
              size="icon"
              className="size-10 rounded-full border border-border/60 bg-card/95 shadow-xl shadow-black/20 backdrop-blur-md"
              aria-label="Franchises"
            />
          }
        >
          <Info className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" sideOffset={8} className={fabMenuClass}>
          {(Object.keys(FRANCHISE_META) as Franchise[]).map((franchise) => {
            const isVisible = visibleFranchises.has(franchise);
            return (
              <DropdownMenuCheckboxItem
                key={franchise}
                checked={isVisible}
                onCheckedChange={() => onToggle(franchise)}
                disabled={isVisible && visibleFranchises.size === 1}
                className="text-xs"
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${FRANCHISE_META[franchise].colorClass}`}
                />
                {FRANCHISE_META[franchise].label}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
