import { FRANCHISE_META, isUpcoming, WORKS, type Franchise, type WorkNode } from "@/data/works";
import { INCOMING } from "@/lib/graph/relations";
import { runtimeOf } from "@/lib/runtime";

// How far the viewer is through what's out. Works still to come aren't
// counted: they can't be watched yet.
export interface Tally {
  watched: number;
  total: number;
}

export interface Progress {
  works: Tally;
  // Minutes, counting works with a known running time.
  minutes: Tally;
  // The MCU, phase by phase.
  phases: Array<Tally & { phase: number }>;
  // Every franchise with something out.
  franchises: Array<Tally & { franchise: Franchise }>;
  // Unwatched works whose prerequisites are all watched, in recommended
  // order: entry points only in franchises already started (or the MCU's
  // first, before anything is watched).
  nextUp: WorkNode[];
}

const NEXT_UP = 5;

function tally(works: WorkNode[], watched: ReadonlySet<string>): Tally {
  return { watched: works.filter((w) => watched.has(w.id)).length, total: works.length };
}

const order = (w: WorkNode) => w.recommendedOrder ?? Number.MAX_SAFE_INTEGER;

export function progressOf(watched: ReadonlySet<string>, today = new Date()): Progress {
  const out = WORKS.filter((w) => !isUpcoming(w, today));
  const minutes = { watched: 0, total: 0 };
  for (const work of out) {
    const runtime = runtimeOf(work)?.minutes ?? 0;
    minutes.total += runtime;
    if (watched.has(work.id)) minutes.watched += runtime;
  }

  const phases = [
    ...new Set(out.flatMap((w) => (w.franchise === "mcu" && w.phase ? [w.phase] : []))),
  ]
    .sort((a, b) => a - b)
    .map((phase) => ({
      phase,
      ...tally(
        out.filter((w) => w.franchise === "mcu" && w.phase === phase),
        watched,
      ),
    }));

  const franchises = (Object.keys(FRANCHISE_META) as Franchise[])
    .map((franchise) => ({
      franchise,
      ...tally(
        out.filter((w) => w.franchise === franchise),
        watched,
      ),
    }))
    .filter((t) => t.total > 0);

  const started = new Set(out.filter((w) => watched.has(w.id)).map((w) => w.franchise));
  if (started.size === 0) started.add("mcu");
  const nextUp = out
    .filter((w) => !watched.has(w.id))
    .filter((w) => {
      const parents = INCOMING.get(w.id) ?? [];
      return parents.length > 0 ? parents.every((id) => watched.has(id)) : started.has(w.franchise);
    })
    .sort((a, b) => order(a) - order(b) || a.releaseDate.localeCompare(b.releaseDate))
    .slice(0, NEXT_UP);

  return { works: tally(out, watched), minutes, phases, franchises, nextUp };
}
