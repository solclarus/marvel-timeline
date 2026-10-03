import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import {
  Earth,
  GitBranch,
  Library,
  ListFilter,
  Settings2,
  SlidersHorizontal,
  Waypoints,
} from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MEDIA, type Medium } from "@/data/works";
import { GROUPS, type GroupBy, type Grouping } from "@/lib/graph/groups";
import type { FocusMode, MediaFilter } from "@/lib/graph/relations";
import { LOCALE_NAMES, LOCALES, useI18n, type Locale, type Messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { EDGE_STYLE, type EdgeStyle } from "./graph-edges";
import { MEDIUM_META } from "./medium-badge";

interface Props {
  media: MediaFilter;
  onMediaChange: (media: MediaFilter) => void;
  grouping: Grouping;
  onVisibleChange: (visible: Set<string>) => void;
  onGroupByChange: (by: GroupBy) => void;
  focusMode: FocusMode;
  onFocusModeChange: (mode: FocusMode) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

// A titled block of the panel: filters, then display options.
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Earth;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-item bg-white/[0.03] p-3 ring-1 ring-white/5">
      <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-foreground/80 uppercase">
        <Icon className="size-3.5" />
        {title}
      </h2>
      {children}
    </section>
  );
}

type MessageKey = { [K in keyof Messages]: Messages[K] extends string ? K : never }[keyof Messages];

// What each of the map's line styles means.
const EDGE_LEGEND: Array<{ style: EdgeStyle; label: MessageKey; detail?: MessageKey }> = [
  { style: "prerequisite", label: "linePrerequisite", detail: "linePrerequisiteDetail" },
  { style: "reference", label: "lineReference", detail: "lineReferenceDetail" },
];

function LineSample({ style }: { style: EdgeStyle }) {
  const { stroke, width, dash } = EDGE_STYLE[style];
  return (
    <svg width="24" height="8" aria-hidden className="shrink-0">
      <line
        x1="1"
        y1="4"
        x2="23"
        y2="4"
        stroke={stroke}
        strokeWidth={width * 0.6}
        strokeDasharray={dash ? "3 3" : undefined}
        strokeLinecap="round"
      />
    </svg>
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: typeof Earth;
  lang?: string;
}

// A two-way switch: both choices side by side, the current one filled.
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel>{label}</SectionLabel>
      <ToggleGroup
        aria-label={label}
        value={[value]}
        // Pressing the current choice again would leave none; ignore it.
        onValueChange={(next: T[]) => next[0] && onChange(next[0])}
        className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-full bg-black/30 p-0.5"
      >
        {options.map(({ value: option, label: optionLabel, icon: Icon, lang }) => (
          <Toggle key={option} value={option} lang={lang} className={PILL_CLASS}>
            {Icon && <Icon className="size-3.5" />}
            {optionLabel}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
}

const PILL_CLASS =
  "flex min-h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-sky-500 data-pressed:bg-white/15 data-pressed:text-foreground";

// Films, series and animation, each on or off; one always stays on.
function MediaToggles({
  media,
  onChange,
}: Pick<Props, "media"> & { onChange: Props["onMediaChange"] }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel>{t.media}</SectionLabel>
      <ToggleGroup
        multiple
        aria-label={t.media}
        value={[...media]}
        onValueChange={(next: Medium[]) => {
          if (next.length > 0) onChange(MEDIA.filter((medium) => next.includes(medium)));
        }}
        className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-full bg-black/30 p-0.5"
      >
        {MEDIA.map((medium) => {
          const { label, icon: Icon } = MEDIUM_META[medium];
          return (
            <Toggle
              key={medium}
              value={medium}
              disabled={media.length === 1 && media[0] === medium}
              className={`${PILL_CLASS} disabled:cursor-default`}
            >
              <Icon className="size-3.5" />
              {t[label]}
            </Toggle>
          );
        })}
      </ToggleGroup>
    </div>
  );
}

const LONG_PRESS_MS = 450;

// The groups as chips: tap to show or hide one, long-press (or right-click)
// to show it alone.
function GroupChips({ grouping, onVisibleChange }: Pick<Props, "grouping" | "onVisibleChange">) {
  const { t, groupLabel } = useI18n();
  const groups = GROUPS[grouping.by];
  const pressTimer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);

  const showOnly = (key: string) => onVisibleChange(new Set([key]));
  const toggle = (key: string) => {
    const visible = new Set(grouping.visible);
    if (visible.has(key)) visible.delete(key);
    else visible.add(key);
    onVisibleChange(visible);
  };
  const cancelPress = () => window.clearTimeout(pressTimer.current);

  const allShown = grouping.visible.size === groups.length;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>
          {t.show}{" "}
          <span className="tabular-nums">
            {t.groupsShown(grouping.visible.size, groups.length)}
          </span>
        </SectionLabel>
        <button
          type="button"
          disabled={allShown}
          onClick={() => onVisibleChange(new Set(groups.map((g) => g.key)))}
          className="rounded-full px-2 py-0.5 text-xs text-sky-400 hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
        >
          {t.showAll}
        </button>
      </div>
      <div className="flex max-h-60 flex-wrap gap-1 overflow-y-auto">
        {groups.map(({ key, colorClass }) => {
          const shown = grouping.visible.has(key);
          const label = groupLabel(grouping.by, key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={shown}
              aria-label={label}
              title={label}
              disabled={shown && grouping.visible.size === 1}
              onPointerDown={() => {
                longPressed.current = false;
                pressTimer.current = window.setTimeout(() => {
                  longPressed.current = true;
                  showOnly(key);
                }, LONG_PRESS_MS);
              }}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onContextMenu={(event) => {
                event.preventDefault();
                cancelPress();
                showOnly(key);
              }}
              onClick={() => {
                if (!longPressed.current) toggle(key);
              }}
              className={cn(
                "flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs tabular-nums transition-colors select-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none disabled:cursor-default",
                shown
                  ? "border-white/15 bg-white/10 text-foreground hover:bg-white/15"
                  : "border-dashed border-white/15 text-muted-foreground/70 hover:border-white/30 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full transition-opacity",
                  colorClass,
                  !shown && "opacity-30",
                )}
              />
              {/* Earth numbers alone; the section already says they're Earths. */}
              {grouping.by === "earth" && key !== "multiverse" ? key : label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground/70">{t.showOnlyHint}</p>
    </div>
  );
}

export function SettingsMenu({
  media,
  onMediaChange,
  grouping,
  onVisibleChange,
  onGroupByChange,
  focusMode,
  onFocusModeChange,
}: Props) {
  const { t, locale, setLocale } = useI18n();
  // The bar no longer shows the filters, so the button flags when one is on.
  const filtered =
    media.length < MEDIA.length || grouping.visible.size < GROUPS[grouping.by].length;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={filtered ? t.viewSettingsFiltered : t.viewSettings}
          />
        }
      >
        <SlidersHorizontal className="size-4" />
        {filtered && (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-sky-400 ring-2 ring-card" />
        )}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={14}
        className="flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-1.5 bg-card/95 backdrop-blur-md"
      >
        <Section title={t.filterSection} icon={ListFilter}>
          <MediaToggles media={media} onChange={onMediaChange} />
          <Segmented<GroupBy>
            label={t.groupBy}
            value={grouping.by}
            onChange={onGroupByChange}
            options={[
              { value: "franchise", label: t.franchise, icon: Library },
              { value: "earth", label: t.earth, icon: Earth },
            ]}
          />
          <GroupChips grouping={grouping} onVisibleChange={onVisibleChange} />
        </Section>
        <Section title={t.displaySection} icon={Settings2}>
          <Segmented<FocusMode>
            label={t.highlight}
            value={focusMode}
            onChange={onFocusModeChange}
            options={[
              { value: "chain", label: t.allRelated, icon: Waypoints },
              { value: "immediate", label: t.directOnly, icon: GitBranch },
            ]}
          />
          <Segmented<Locale>
            label={t.language}
            value={locale}
            onChange={setLocale}
            options={LOCALES.map((option) => ({
              value: option,
              label: LOCALE_NAMES[option],
              lang: option,
            }))}
          />
        </Section>
        <div className="flex flex-col gap-1.5 px-3 pt-1 pb-2">
          <SectionLabel>{t.lines}</SectionLabel>
          {EDGE_LEGEND.map(({ style, label, detail }) => (
            <div key={style} className="flex items-start gap-2 text-xs">
              <span className="flex h-4 items-center">
                <LineSample style={style} />
              </span>
              <span>
                {t[label]}
                {detail && <span className="text-muted-foreground"> · {t[detail]}</span>}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
