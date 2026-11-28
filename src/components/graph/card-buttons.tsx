import { Check, Share } from "lucide-react";
import { useEffect, useState } from "react";

import { isUpcoming, type WorkNode } from "@/data/works";
import { useI18n } from "@/lib/i18n";
import { sharePath } from "@/lib/share-pages";
import { setWatched, toggleWatched, useWatched } from "@/lib/watched";

export const ICON_BUTTON =
  "rounded-full p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none";

// The link to what's on screen. A work's link goes through its preview page
// (see `share-pages.ts`), so the post shows that work; a route's is the
// address as it is. Phones open the share sheet; elsewhere it's copied.
export function ShareButton({ workId }: { workId: string | undefined }) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const linkOf = () => {
    if (!workId) return location.href;
    const query = new URLSearchParams(location.search);
    query.delete("work");
    const search = query.size > 0 ? `?${query}` : "";
    return new URL(sharePath(workId, locale) + search, document.baseURI).href;
  };

  const share = async () => {
    const url = linkOf();
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      // Dismissing the sheet rejects; nothing to do then.
      await navigator.share({ url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  return (
    <>
      <button type="button" onClick={share} className={ICON_BUTTON} aria-label={t.shareLink}>
        {copied ? <Check className="size-4 text-marquee" /> : <Share className="size-4" />}
      </button>
      <output className="sr-only">{copied ? t.linkCopied : ""}</output>
    </>
  );
}

// Marks the card's work as watched, or not.
export function WatchedToggle({ work }: { work: WorkNode }) {
  const { t, titleOf } = useI18n();
  const watched = useWatched().has(work.id);
  return (
    <button
      type="button"
      onClick={() => toggleWatched(work.id)}
      aria-pressed={watched}
      aria-label={t.markWatched(titleOf(work))}
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 py-0.5 pr-2 pl-1.5 text-xs whitespace-nowrap text-foreground/85 transition-colors hover:border-white/20 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none aria-pressed:border-white/60 aria-pressed:bg-white aria-pressed:text-neutral-900"
    >
      <Check className="size-3.5" strokeWidth={watched ? 3 : 2} aria-hidden />
      {t.watched}
    </button>
  );
}

// Marks a whole list watched, or (once it all is) unmarks it. Only what's
// out counts: a work still to come can't have been watched.
export function BulkWatched({ works, label }: { works: WorkNode[]; label?: string }) {
  const { t } = useI18n();
  const watched = useWatched();
  const ids = works.filter((w) => !isUpcoming(w)).map((w) => w.id);
  if (ids.length === 0) return null;
  const all = ids.every((id) => watched.has(id));
  const text = all ? t.unmarkAll : t.markAll;
  return (
    <button
      type="button"
      onClick={() => setWatched(ids, !all)}
      aria-label={label ? `${text}: ${label}` : undefined}
      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-normal whitespace-nowrap text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-marquee focus-visible:outline-none"
    >
      {text}
    </button>
  );
}
