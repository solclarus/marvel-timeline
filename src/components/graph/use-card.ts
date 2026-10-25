import { useState } from "react";

import type { ListFocus } from "@/lib/url-state";

// What the card at the top shows: a work (its watch-first list open or
// not) or a route (its works always listed).
export type CardView = { kind: "work"; id: string; open: boolean } | { kind: "route"; id: string };

// The card is the one place a selection lives, and it never switches the
// map or list behind it. Picking a work from its list moves the card to
// that work and remembers where it came from, so ‹ steps back; ✕ (or
// picking anything outside the card) starts over.
export function useCard(initial: { selectedId: string | null; listFocus: ListFocus | null }) {
  const [current, setCurrent] = useState<CardView | null>(() => {
    const focus = initial.listFocus;
    if (focus?.kind === "route") return { kind: "route", id: focus.id };
    if (focus?.kind === "before") return { kind: "work", id: focus.id, open: true };
    return initial.selectedId ? { kind: "work", id: initial.selectedId, open: false } : null;
  });
  const [history, setHistory] = useState<CardView[]>([]);

  const selectedId = current?.kind === "work" ? current.id : null;
  const startOver = (next: CardView | null) => {
    setCurrent(next);
    setHistory([]);
  };

  return {
    current,
    selectedId,
    // The card it was opened from, for ‹.
    previous: history.at(-1) ?? null,
    // From the map, the list or search: a fresh card, or none.
    select: (id: string | null) => startOver(id ? { kind: "work", id, open: false } : null),
    openRoute: (id: string) => startOver({ kind: "route", id }),
    // From the card's own list.
    pick: (id: string) => {
      if (current) setHistory((stack) => [...stack, current]);
      setCurrent({ kind: "work", id, open: false });
    },
    back: () => {
      setCurrent(history.at(-1) ?? null);
      setHistory((stack) => stack.slice(0, -1));
    },
    toggleOpen: () =>
      setCurrent((view) => (view?.kind === "work" ? { ...view, open: !view.open } : view)),
    close: () => startOver(null),
    // Escape folds an open list first, then closes the card.
    escape: () => {
      if (current?.kind === "work" && current.open) setCurrent({ ...current, open: false });
      else startOver(null);
    },
    // For the URL: an open list or a route, as before.
    listFocus: (current?.kind === "route"
      ? { kind: "route", id: current.id }
      : current?.open
        ? { kind: "before", id: current.id }
        : null) satisfies ListFocus | null,
  };
}
