import { Autocomplete } from "@base-ui/react/autocomplete";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { FRANCHISE_META, posterUrl, WORKS, type WorkNode } from "@/data/works";
import { useI18n } from "@/lib/i18n";

import { MediumBadge } from "./medium-badge";

const MAX_RESULTS = 8;

// Case- and width-insensitive (NFKC folds full-width forms), with
// punctuation such as ・ and ／ treated as spaces, in any script.
const normalize = (text: string) =>
  text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

// Both titles are searchable whatever the UI language.
const INDEX = WORKS.map((work) => ({
  work,
  keys: [normalize(work.title), normalize(work.titleJa)],
}));

// Title prefix matches first, then word-start matches, then the rest, each
// by release date.
export function searchWorks(query: string): WorkNode[] {
  const q = normalize(query);
  if (!q) return [];
  const rank = (keys: string[]) =>
    Math.min(...keys.map((key) => (key.startsWith(q) ? 0 : key.includes(` ${q}`) ? 1 : 2)));
  return INDEX.filter(({ keys }) => keys.some((key) => key.includes(q)))
    .sort(
      (a, b) => rank(a.keys) - rank(b.keys) || a.work.releaseDate.localeCompare(b.work.releaseDate),
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
  const { t, titleOf, franchiseLabel } = useI18n();
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
      itemToStringValue={(work: WorkNode) => titleOf(work)}
      autoHighlight
      value={query}
      onValueChange={(value, details) => {
        if (details.reason === "item-press") {
          const work = results.find((w) => titleOf(w) === value);
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
          aria-label={t.searchLabel}
          placeholder={t.searchPlaceholder}
          // Keeps the map's Escape (clear selection) out of it.
          onKeyDown={(event) => {
            if (event.key === "Escape") event.stopPropagation();
          }}
          className="h-8 w-full rounded-full bg-muted/60 pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:bg-muted"
        />
      </div>
      <Autocomplete.Portal>
        <Autocomplete.Positioner side="top" sideOffset={18} align="start" className="z-50">
          <Autocomplete.Popup className="max-h-[60vh] w-(--anchor-width) min-w-64 overflow-y-auto rounded-surface border bg-card/95 p-1.5 text-card-foreground shadow-xl shadow-black/30 backdrop-blur-md">
            <Autocomplete.Empty className="px-3 py-2 text-xs text-muted-foreground empty:hidden">
              {query.trim() !== "" && t.noMatches}
            </Autocomplete.Empty>
            <Autocomplete.List>
              {(work: WorkNode) => (
                <Autocomplete.Item
                  key={work.id}
                  value={work}
                  className="flex cursor-pointer items-center gap-2.5 rounded-item px-2 py-1.5 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <img
                    src={posterUrl(work)}
                    alt=""
                    loading="lazy"
                    className="h-9 w-6 shrink-0 rounded-thumb bg-muted object-cover"
                    onError={(event) => (event.currentTarget.style.visibility = "hidden")}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{titleOf(work)}</span>
                    <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                      <MediumBadge work={work} className="text-[9px]" />
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${FRANCHISE_META[work.franchise].colorClass}`}
                      />
                      <span className="truncate">
                        {franchiseLabel(work.franchise)} · {work.releaseDate.slice(0, 4)}
                      </span>
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
