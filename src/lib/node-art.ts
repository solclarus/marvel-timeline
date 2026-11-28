import type { NodeArt } from "@/lib/graph/metrics";

import { storedState } from "./stored-state";

// Whether the map shows posters or title logos; remembered on this device.
const store = storedState<NodeArt>(
  "marvel-timeline:art",
  (raw) => (raw === "logo" ? "logo" : "poster"),
  (art) => art,
);

export const useNodeArt = store.use;
