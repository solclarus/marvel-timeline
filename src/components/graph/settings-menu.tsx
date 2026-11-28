import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import {
  ChartColumnBig,
  ChevronLeft,
  ChevronRight,
  Cog,
  Earth,
  Image,
  Info,
  Library,
  ListFilter,
  Menu,
  Monitor,
  Moon,
  Sun,
  Type,
} from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MEDIA, type EdgeKind, type Medium } from "@/data/works";
import { GROUPS, type GroupBy, type Grouping } from "@/lib/graph/groups";
import type { NodeArt } from "@/lib/graph/metrics";
import type { MediaFilter } from "@/lib/graph/relations";
import { LOCALE_NAMES, LOCALES, useI18n, type Locale, type Messages } from "@/lib/i18n";
import { useNodeArt } from "@/lib/node-art";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

import { EDGE_STYLE } from "./graph-edges";
import { MEDIUM_META } from "./medium-badge";

interface Props {
  media: MediaFilter;
  onMediaChange: (media: MediaFilter) => void;
  grouping: Grouping;
  onVisibleChange: (visible: Set<string>) => void;
  onGroupByChange: (by: GroupBy) => void;
  onAbout: () => void;
  onProgressOpen: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

// A page's controls, in one block under its header.
function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-item bg-tint/3 p-3 ring-1 ring-tint/5">
      {children}
    </section>
  );
}

type MessageKey = { [K in keyof Messages]: Messages[K] extends string ? K : never }[keyof Messages];

// What each of the map's line styles means.
const EDGE_LEGEND: Array<{ style: EdgeKind; label: MessageKey; detail?: MessageKey }> = [
  { style: "prerequisite", label: "linePrerequisite", detail: "linePrerequisiteDetail" },
  { style: "reference", label: "lineReference", detail: "lineReferenceDetail" },
];

function LineSample({ style }: { style: EdgeKind }) {
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

// A switch: the choices side by side, the current one filled.
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
        className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-full bg-black/7 p-0.5 dark:bg-black/30"
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
  "flex min-h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-marquee data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-sm dark:data-pressed:bg-tint/15 dark:data-pressed:shadow-none";

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
        className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-full bg-black/7 p-0.5 dark:bg-black/30"
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
          className="rounded-full px-2 py-0.5 text-xs text-marquee hover:bg-tint/5 disabled:pointer-events-none disabled:opacity-40"
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
                "flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs tabular-nums transition-colors select-none focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none disabled:cursor-default",
                shown
                  ? "border-tint/15 bg-tint/10 text-foreground hover:bg-tint/15"
                  : "border-dashed border-tint/15 text-muted-foreground hover:border-tint/30 hover:text-foreground dark:text-muted-foreground/70",
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
      <p className="text-xs text-muted-foreground">{t.showOnlyHint}</p>
    </div>
  );
}

type Page = "menu" | "filter" | "display" | "settings";

// The bar's last button: a short menu, in three groups. Watching opens the
// viewer's own card; the map and list's filters and display, and the app's
// settings (language, theme), open as pages in the same panel, so the map
// stays in view while they change (‹ goes back); About opens a dialog.
export function SettingsMenu({
  media,
  onMediaChange,
  grouping,
  onVisibleChange,
  onGroupByChange,
  onAbout,
  onProgressOpen,
}: Props) {
  const { t, locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<Page>("menu");
  const [art, setArt] = useNodeArt();
  const [theme, setTheme] = useTheme();
  // The bar no longer shows the filters, so the button flags when one is on.
  const filtered =
    media.length < MEDIA.length || grouping.visible.size < GROUPS[grouping.by].length;
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPage("menu");
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={filtered ? t.menuFiltered : t.menu}
          />
        }
      >
        <Menu className="size-4" />
        {filtered && (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-marquee ring-2 ring-card" />
        )}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={14}
        className={cn(
          "flex flex-col gap-1.5 bg-card/95 backdrop-blur-md",
          page === "menu" ? "w-56 p-1.5" : "w-[min(22rem,calc(100vw-2rem))]",
        )}
      >
        {page === "menu" && (
          <nav aria-label={t.menu} className="flex flex-col gap-1 py-0.5">
            <MenuGroup label={t.menuWatching}>
              <MenuLink
                icon={ChartColumnBig}
                label={t.progress}
                onClick={() => {
                  setOpen(false);
                  onProgressOpen();
                }}
              />
            </MenuGroup>
            <MenuGroup label={t.menuView}>
              <MenuLink
                icon={ListFilter}
                label={t.filterSection}
                note={filtered ? t.filterOn : undefined}
                more
                onClick={() => setPage("filter")}
              />
              <MenuLink
                icon={Image}
                label={t.displaySection}
                more
                onClick={() => setPage("display")}
              />
            </MenuGroup>
            <MenuGroup label={t.menuApp}>
              <MenuLink
                icon={Cog}
                label={t.menuSettings}
                more
                onClick={() => setPage("settings")}
              />
              <MenuLink
                icon={Info}
                label={t.about}
                onClick={() => {
                  setOpen(false);
                  onAbout();
                }}
              />
            </MenuGroup>
          </nav>
        )}
        {page === "filter" && (
          <>
            <PageHeader title={t.filterSection} onBack={() => setPage("menu")} />
            <Section>
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
          </>
        )}
        {page === "display" && (
          <>
            <PageHeader title={t.displaySection} onBack={() => setPage("menu")} />
            <Section>
              <Segmented<NodeArt>
                label={t.nodeArt}
                value={art}
                onChange={setArt}
                options={[
                  { value: "poster", label: t.artPoster, icon: Image },
                  { value: "logo", label: t.artLogo, icon: Type },
                ]}
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
          </>
        )}
        {page === "settings" && (
          <>
            <PageHeader title={t.menuSettings} onBack={() => setPage("menu")} />
            <Section>
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
              <Segmented<Theme>
                label={t.theme}
                value={theme}
                onChange={setTheme}
                options={[
                  { value: "system", label: t.themeSystem, icon: Monitor },
                  { value: "light", label: t.themeLight, icon: Sun },
                  { value: "dark", label: t.themeDark, icon: Moon },
                ]}
              />
            </Section>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

// A titled run of menu rows.
function MenuGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="px-2 pt-1 pb-0.5 text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

// One row of the menu: where it leads, a dot when it's on (a filter), and ›
// when it opens a page of its own.
function MenuLink({
  icon: Icon,
  label,
  note,
  more = false,
  onClick,
}: {
  icon: typeof Earth;
  label: string;
  note?: string;
  more?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-tint/8 focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none"
    >
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      <span className="flex-1">{label}</span>
      {note && (
        <>
          <span className="size-1.5 rounded-full bg-marquee" aria-hidden />
          <span className="sr-only">{note}</span>
        </>
      )}
      {more && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />}
    </button>
  );
}

// A page's title, with ‹ back to the menu.
function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onBack}
        aria-label={t.backTo(t.menu)}
        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-tint/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <h2 className="text-sm font-medium">{title}</h2>
    </div>
  );
}
