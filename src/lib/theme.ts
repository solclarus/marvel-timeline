import { storedState } from "./stored-state";

// Light, dark, or whatever the system says (the default), remembered on the
// device. index.html runs the same choice inline before the app loads, so
// the first paint is already in the right theme; keep the two in step.
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "marvel-timeline:theme";
// The browser chrome's color: each theme's --background.
const THEME_COLOR = { light: "#ffffff", dark: "#141414" };

const isTheme = (value: string | null): value is Theme =>
  (THEMES as readonly (string | null)[]).includes(value);

const theme = storedState<Theme>(
  STORAGE_KEY,
  (raw) => (isTheme(raw) ? raw : "system"),
  (value) => value,
);

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function apply(choice: Theme) {
  const dark = choice === "dark" || (choice === "system" && darkQuery().matches);
  document.documentElement.classList.toggle("dark", dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? THEME_COLOR.dark : THEME_COLOR.light);
}

// Applies the remembered theme, then follows the system while it's "system".
export function startTheme() {
  apply(theme.get());
  darkQuery().addEventListener("change", () => apply(theme.get()));
}

export function useTheme(): [Theme, (next: Theme) => void] {
  const [current, set] = theme.use();
  return [
    current,
    (next) => {
      set(next);
      apply(next);
    },
  ];
}
