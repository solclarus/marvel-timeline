import { Autocomplete } from "@base-ui/react/autocomplete";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { FRANCHISE_META, posterUrl, WORKS, type WorkNode } from "@/data/works";

const MAX_RESULTS = 8;

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const INDEX = WORKS.map((work) => ({ work, key: normalize(work.title) }));

// Title prefix matches first, then word-start matches, then the rest, each
// by release date.
export function searchWorks(query: string): WorkNode[] {
  const q = normalize(query);
  if (!q) return [];
  const rank = (key: string) => (key.startsWith(q) ? 0 : key.includes(` ${q}`) ? 1 : 2);
  return INDEX.filter(({ key }) => key.includes(q))
    .sort(
      (a, b) => rank(a.key) - rank(b.key) || a.work.releaseDate.localeCompare(b.work.releaseDate),
    )
    .slice(0, MAX_RESULTS)
    .map(({ work }) => work);
}

interface Props {
  onSelect: (id: string) => void;
}

// Searches every work, whatever the map currently shows; revealing the pick
// is up to `onSelect`.
export function SearchBox({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = searchWorks(query);

  // "/" or Cmd/Ctrl+K jumps to the search box from anywhere.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const typing =
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName));
      if (
        (event.key === "/" && !typing) ||
        (event.key === "k" && (event.metaKey || event.ctrlKey))
      ) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Autocomplete.Root
      items={WORKS}
      filteredItems={results}
      itemToStringValue={(work: WorkNode) => work.title}
      autoHighlight
      value={query}
      onValueChange={(value, details) => {
        if (details.reason === "item-press") {
          const work = results.find((w) => w.title === value);
          if (work) onSelect(work.id);
          setQuery("");
          inputRef.current?.blur();
          return;
        }
        setQuery(value);
      }}
    >
      <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Autocomplete.Input
          ref={inputRef}
          aria-label="Search works"
          placeholder="Search works…"
          // Keeps the map's Escape (clear selection) out of it.
          onKeyDown={(event) => {
            if (event.key === "Escape") event.stopPropagation();
          }}
          className="h-8 w-full rounded-full bg-muted/60 pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:bg-muted"
        />
      </div>
      <Autocomplete.Portal>
        <Autocomplete.Positioner sideOffset={18} align="start" className="z-50">
          <Autocomplete.Popup className="max-h-[60vh] w-(--anchor-width) min-w-64 overflow-y-auto rounded-lg border bg-card/95 p-1 text-card-foreground shadow-xl shadow-black/30 backdrop-blur-md">
            <Autocomplete.Empty className="px-3 py-2 text-xs text-muted-foreground empty:hidden">
              {query.trim() !== "" && "No matches"}
            </Autocomplete.Empty>
            <Autocomplete.List>
              {(work: WorkNode) => (
                <Autocomplete.Item
                  key={work.id}
                  value={work}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <img
                    src={posterUrl(work)}
                    alt=""
                    loading="lazy"
                    className="h-9 w-6 shrink-0 rounded-sm bg-muted object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{work.title}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span
                        className={`size-1.5 rounded-full ${FRANCHISE_META[work.franchise].colorClass}`}
                      />
                      {FRANCHISE_META[work.franchise].label} · {work.releaseDate.slice(0, 4)}
                      {work.tmdb.type === "tv" && (
                        <span className="rounded-sm border px-1 text-[9px] font-semibold">TV</span>
                      )}
                    </span>
                  </span>
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
