import * as m from "motion/react-m";

import { cn } from "@/lib/utils";

export function FabBar({
  from,
  className,
  children,
}: {
  from: "top" | "bottom";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <m.div
      initial={{ y: from === "top" ? -60 : 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex items-center gap-1 rounded-full border border-border/60 bg-card/95 p-2 shadow-xl shadow-black/20 backdrop-blur-md",
        className,
      )}
    >
      {children}
    </m.div>
  );
}

export function FabDivider() {
  return <div className="mx-0.5 h-5 w-px bg-border/60" />;
}

export const fabMenuClass = "w-auto min-w-44 bg-card/95 backdrop-blur-md";
