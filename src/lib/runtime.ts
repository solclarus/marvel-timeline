import { RUNTIMES } from "@/data/runtimes";
import type { WorkNode } from "@/data/works";

export function runtimeOf(work: WorkNode) {
  return RUNTIMES[work.id];
}

// How long a list takes to watch, counting only works whose runtime is
// known; `missing` says how many aren't.
export function totalRuntime(works: WorkNode[]) {
  let minutes = 0;
  let missing = 0;
  for (const work of works) {
    const runtime = RUNTIMES[work.id];
    if (runtime) minutes += runtime.minutes;
    else missing++;
  }
  return { minutes, missing };
}
