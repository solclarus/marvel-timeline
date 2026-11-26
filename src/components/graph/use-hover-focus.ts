import { useEffect, useState } from "react";

import { groupCardAt, type computeGroupCards, type computePhaseBands } from "@/lib/graph/layout";

const HOVER_DELAY_MS = 250;

// Focus on a group card or phase band, by hovering it (mouse) or tapping
// its label (pinned until tapped again or cleared), or on a work and its
// relatives by hovering its poster (with `workHover`; otherwise a poster
// counts as the card it sits in). Hover counts once the pointer rests, so
// sweeping across doesn't flicker; a poster wins over the phase band it
// sits in, and a phase band over its card. A selection overrides them all.
// A hover only counts in the layout it began in (`layoutKey`), and ends when
// the map pans or zooms (`clearHover`): either moves what's under a pointer
// that hasn't moved.
export function useHoverFocus({
  groupCards,
  phaseBands,
  selectedId,
  workHover,
  layoutKey,
  onPin,
}: {
  groupCards: ReturnType<typeof computeGroupCards>;
  phaseBands: ReturnType<typeof computePhaseBands>;
  selectedId: string | null;
  workHover: boolean;
  layoutKey: string;
  // Called when a label is pinned, e.g. to clear the selection.
  onPin: () => void;
}) {
  // `pending` keeps where the pointer entered, for the hover chip.
  const [pending, setPending] = useState<{
    id: string;
    key: string;
    x: number;
    y: number;
  } | null>(null);
  const [hovered, setHovered] = useState<{ id: string; key: string } | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  useEffect(() => {
    if (pending === null) return;
    const timer = window.setTimeout(
      () => setHovered({ id: pending.id, key: pending.key }),
      HOVER_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [pending]);

  // A settled hover holds until the next target settles, so crossing a
  // poster's edge changes the map once rather than clearing it in between;
  // it clears once the pointer is over nothing.
  const live = pending?.key === layoutKey ? pending : null;
  const hoverId = live && hovered?.key === layoutKey ? hovered.id : null;
  const focusedId = selectedId ? null : (hoverId ?? pinnedId);
  const focusedPhase = phaseBands.find((band) => `phase:${band.phase}` === focusedId);
  const focusedCard = groupCards.find((card) => `group:${card.key}` === focusedId);
  const focusedWorkId =
    workHover && focusedId?.startsWith("work:") ? focusedId.slice("work:".length) : null;

  // What the pointer rests on: a poster, else a phase band, else a card.
  const targetAt = (target: Element, point: { x: number; y: number }) => {
    const work = workHover
      ? target.closest<HTMLElement>("[data-work-id]")?.dataset.workId
      : undefined;
    if (work) return `work:${work}`;
    const phase = groupCardAt(phaseBands, point);
    if (phase) return `phase:${phase.phase}`;
    const card = groupCardAt(groupCards, point);
    return card ? `group:${card.key}` : null;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
    const id = targetAt(event.target as Element, point);
    if (id === null) setHovered(null);
    // Same target: keep the state as is, so moving within it doesn't re-render.
    setPending((current) =>
      (current?.id ?? null) === id && current?.key === layoutKey
        ? current
        : id === null
          ? null
          : { id, key: layoutKey, x: event.clientX, y: event.clientY },
    );
  };

  const clearHover = () => {
    setPending(null);
    setHovered(null);
  };

  return {
    focusedPhase,
    focusedCard,
    focusedWorkId,
    pinnedId,
    // Where a group's hover began, while hover (not a pin) is what's
    // focused: the chip only shows then, since a pinned label already names
    // its group, and a poster has its own tooltip.
    hoverChipAt: live && live.id === focusedId && !focusedWorkId ? live : null,
    togglePinned: (id: string) => {
      onPin();
      setPinnedId((current) => (current === id ? null : id));
    },
    clearPinned: () => setPinnedId(null),
    onPointerMove,
    onPointerLeave: clearHover,
    clearHover,
  };
}
