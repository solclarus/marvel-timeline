// A small page per work, so a shared link previews that work (its title,
// poster and what it builds on) instead of the site's own card. Crawlers
// don't run the app, and the app keeps its state in the query string, which a
// static host can't serve different tags for; so the build writes these pages
// at `w/<id>/` (English) and `w/<id>/ja.html` (Japanese), and each sends a
// visitor on to the app with the link's query. Kept free of path aliases so
// `vite.config.ts` can import it.
import { WORKS, type WorkNode } from "../data/works";

export const SITE_URL = "https://solclarus.github.io/marvel-timeline/";

export type ShareLocale = "en" | "ja";

// Where a work's page sits, relative to the site root.
export function sharePath(id: string, locale: ShareLocale): string {
  return `w/${id}/${locale === "ja" ? "ja.html" : ""}`;
}

const BY_ID = new Map(WORKS.map((w) => [w.id, w]));

function escape(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// At most three titles, so a preview's text stays short.
const NAMED = 3;
function list(titles: string[], locale: ShareLocale): string {
  const named = titles.slice(0, NAMED);
  const rest = titles.length - named.length;
  if (locale === "ja") {
    return named.map((t) => `『${t}』`).join("") + (rest > 0 ? `ほか${rest}作品` : "");
  }
  const items = rest > 0 ? [...named, `${rest} more`] : named;
  if (items.length <= 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function describe(work: WorkNode, locale: ShareLocale): { title: string; description: string } {
  const ja = locale === "ja";
  const name = ja ? work.titleJa : work.title;
  const before = (work.dependsOn ?? [])
    .filter((dep) => dep.kind === "prerequisite")
    .map((dep) => BY_ID.get(dep.id))
    .filter((w): w is WorkNode => !!w)
    .map((w) => (ja ? w.titleJa : w.title));
  if (ja) {
    return {
      title: `${name}の前に観る作品 | Marvel Timeline`,
      description:
        before.length > 0
          ? `直前の前提作品は${list(before, locale)}。観る前に押さえたい作品を、マーベル作品のつながりマップで順番に確認できます。`
          : "ここから観始められる作品です。マーベル作品のつながりマップで、前後の作品を確認できます。",
    };
  }
  return {
    title: `${name}: what to watch first | Marvel Timeline`,
    description:
      before.length > 0
        ? `Builds on ${list(before, locale)}. See everything to watch first, in order, on a map of how Marvel's films and series connect.`
        : "A place to start: it builds on nothing else. See what comes after it on a map of how Marvel's films and series connect.",
  };
}

export function sharePage(work: WorkNode, locale: ShareLocale): string {
  const { title, description } = describe(work, locale);
  const url = SITE_URL + sharePath(work.id, locale);
  // A portrait poster suits the small card; without one, the site's image.
  const image = work.poster ? `https://image.tmdb.org/t/p/w780${work.poster}` : `${SITE_URL}og.png`;
  const card = work.poster ? "summary" : "summary_large_image";
  const id = JSON.stringify(work.id);
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="UTF-8" />
    <title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Marvel Timeline" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta name="twitter:card" content="${card}" />
    <script>
      var query = new URLSearchParams(location.search);
      if (!query.has("work")) query.set("work", ${id});
      location.replace("../../?" + query + location.hash);
    </script>
  </head>
  <body>
    <a href="../../?work=${encodeURIComponent(work.id)}">${escape(title)}</a>
  </body>
</html>
`;
}

// Every work's pages, by output path.
export function sharePages(): Map<string, string> {
  const pages = new Map<string, string>();
  for (const work of WORKS) {
    for (const locale of ["en", "ja"] as const) {
      const path = sharePath(work.id, locale);
      pages.set(path.endsWith("/") ? `${path}index.html` : path, sharePage(work, locale));
    }
  }
  return pages;
}
