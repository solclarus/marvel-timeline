import { useEffect, useState } from "react";

import { groupCardAt, type computeGroupCards, type computePhaseBands } from "@/lib/graph/layout";

const HOVER_DELAY_MS = 250;

// Focus on a group card or phase band, by hovering it (mouse) or tapping
// its label (pinned until tapped again or cleared). Hover counts anywhere
// inside the card, posters included, once the pointer rests, so sweeping
// across doesn't flicker; phase bands sit inside a card and win over it.
// A selection overrides both.
export function useHoverFocus({
  groupCards,
  phaseBands,
  selectedId,
  onPin,
}: {
  groupCards: ReturnType<typeof computeGroupCards>;
  phaseBands: ReturnType<typeof computePhaseBands>;
  selectedId: string | null;
  // Called when a label is pinned, e.g. to clear the selection.
  onPin: () => void;
}) {
  // `pending` keeps where the pointer entered, for the hover chip.
  const [pending, setPending] = useState<{ id: string; x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  useEffect(() => {
    if (pending === null) return;
    const timer = window.setTimeout(() => setHovered(pending.id), HOVER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);

  // A hover is stale once the pointer moves on.
  const hoverId = hovered !== null && hovered === pending?.id ? hovered : null;
  const focusedId = selectedId ? null : (hoverId ?? pinnedId);
  const focusedPhase = phaseBands.find((band) => `phase:${band.phase}` === focusedId);
  const focusedCard = groupCards.find((card) => `group:${card.key}` === focusedId);

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
    const phase = groupCardAt(phaseBands, point);
    const card = phase ? undefined : groupCardAt(groupCards, point);
    const id = phase ? `phase:${phase.phase}` : card ? `group:${card.key}` : null;
    // Same target: keep the state as is, so moving within it doesn't re-render.
    setPending((current) =>
      (current?.id ?? null) === id
        ? current
        : id === null
          ? null
          : { id, x: event.clientX, y: event.clientY },
    );
  };

  return {
    focusedPhase,
    focusedCard,
    pinnedId,
    // Where a hover began, while hover (not a pin) is what's focused: the
    // chip only shows then, since a pinned label already names its group.
    hoverChipAt: pending && pending.id === focusedId ? pending : null,
    togglePinned: (id: string) => {
      onPin();
      setPinnedId((current) => (current === id ? null : id));
    },
    clearPinned: () => setPinnedId(null),
    onPointerMove,
    onPointerLeave: () => setPending(null),
  };
}
