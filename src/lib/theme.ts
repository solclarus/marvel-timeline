import { storedState } from "./stored-state";

// Light or dark. Until the viewer picks one, the system's choice holds (and
// is followed as it changes); a pick is remembered on the device. index.html
// runs the same choice inline before the app loads, so the first paint is
// already in the right theme; keep the two in step.
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "marvel-timeline:theme";
// The browser chrome's color: each theme's --background.
const THEME_COLOR = { light: "#f5f3ef", dark: "#141414" };

const isTheme = (value: string | null): value is Theme =>
  (THEMES as readonly (string | null)[]).includes(value);

// The viewer's pick, or null before there is one (an older "system" counts
// as none).
const picked = storedState<Theme | null>(
  STORAGE_KEY,
  (raw) => (isTheme(raw) ? raw : null),
  (value) => value ?? "",
);

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");
const systemTheme = (): Theme => (darkQuery().matches ? "dark" : "light");

function apply(theme: Theme) {
  const dark = theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? THEME_COLOR.dark : THEME_COLOR.light);
}

// Applies the theme, then follows the system until the viewer picks one.
export function startTheme() {
  apply(picked.get() ?? systemTheme());
  darkQuery().addEventListener("change", () => {
    if (!picked.get()) apply(systemTheme());
  });
}

export function useTheme(): [Theme, (next: Theme) => void] {
  const [current] = picked.use();
  return [
    current ?? systemTheme(),
    (next) => {
      picked.set(next);
      apply(next);
    },
  ];
}
