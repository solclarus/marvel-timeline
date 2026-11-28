import { useLayoutEffect, useRef } from "react";

import { motionMs } from "@/lib/motion";

// A little past the target, then back: the poster lands with a bounce.
const LANDING = "cubic-bezier(0.3, 1.25, 0.4, 1)";

// Flies the card's poster out of the selected poster on the map, so the
// card reads as opening from it. With no poster on screen to leave from
// (a search pick far away, or the list), it pops in where it is instead.
export function useFlightFromMap(id: string | undefined) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const target = ref.current;
    if (!id || !target) return;
    const from = document.getElementById(id)?.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const onScreen =
      from &&
      from.width > 4 &&
      from.bottom > 0 &&
      from.right > 0 &&
      from.top < window.innerHeight &&
      from.left < window.innerWidth;
    const keyframes = onScreen
      ? [
          {
            transform: `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${
              from.top + from.height / 2 - (to.top + to.height / 2)
            }px) scale(${from.width / to.width})`,
          },
          { transform: "none" },
        ]
      : [
          { transform: "scale(0.9) rotate(-2deg)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ];
    const animation = target.animate(keyframes, {
      duration: motionMs(onScreen ? 650 : 360),
      easing: LANDING,
    });
    return () => animation.cancel();
  }, [id]);
  return ref;
}
