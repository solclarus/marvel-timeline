import { domAnimation, LazyMotion } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Graph } from "@/components/graph/graph";
import { TooltipProvider } from "@/components/ui/tooltip";

import "@/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LazyMotion features={domAnimation} strict>
      <TooltipProvider>
        <Graph />
      </TooltipProvider>
    </LazyMotion>
  </StrictMode>,
);
