import { ChevronDown, Info } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NOT_ON_THE_MAP, type OffMapReason } from "@/data/not-on-the-map";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const REPO_URL = "https://github.com/solclarus/marvel-timeline";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="space-y-2 text-sm/relaxed">{children}</div>
    </section>
  );
}

const linkClass = "underline underline-offset-2 hover:text-foreground";

// What the site is, where its data comes from, what it leaves off, and who
// owns what: the required TMDB notice, the unofficial-fan-project
// disclaimer, and the license. Opened from the command bar; there are no other pages.
export function AboutDialog() {
  const { t, locale } = useI18n();
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label={t.about} />}>
        <Info className="size-4" />
      </DialogTrigger>
      <DialogContent closeLabel={t.close}>
        <DialogTitle>{t.aboutTitle}</DialogTitle>
        <DialogDescription className="mt-1">{t.aboutLead}</DialogDescription>

        <div className="mt-5 space-y-5">
          <Section title={t.aboutData}>
            <p>{t.aboutDataBody}</p>
            <div className="flex items-center gap-3 rounded-item border bg-muted/40 p-3">
              <a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noreferrer"
                className="shrink-0"
              >
                <img
                  src={`${import.meta.env.BASE_URL}tmdb-logo.svg`}
                  alt="TMDB"
                  className="h-3 w-auto"
                />
              </a>
              <p className="text-xs text-muted-foreground">
                <span lang="en">
                  This website uses TMDB and the TMDB APIs but is not endorsed, certified, or
                  otherwise approved by TMDB.
                </span>
                {locale === "ja" && (
                  <span className="mt-1 block">
                    本サイトは TMDB と TMDB API を利用していますが、TMDB
                    による推奨・認定・承認は受けていません。
                  </span>
                )}
              </p>
            </div>
          </Section>

          <Section title={t.aboutOffMap}>
            <p>{t.aboutOffMapBody}</p>
            <OffMapList />
          </Section>

          <Section title={t.aboutRights}>
            <p>{t.aboutRightsBody}</p>
          </Section>

          <Section title={t.aboutLicense}>
            <p>
              {t.aboutLicenseBody}{" "}
              <a href={REPO_URL} className={linkClass} target="_blank" rel="noreferrer">
                {t.viewOnGitHub}
              </a>
            </p>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const REASONS: OffMapReason[] = ["unlinked", "undated", "unconfirmed", "extra"];

// The works left off the map, folded away until asked for, grouped by what
// keeps them off; each says what would bring it in.
function OffMapList() {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const ja = locale === "ja";
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 py-0.5 pr-1.5 pl-2.5 text-xs hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
      >
        {open ? t.offMapHide : t.offMapShow(NOT_ON_THE_MAP.length)}
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          {REASONS.map((reason) => {
            const works = NOT_ON_THE_MAP.filter((work) => work.reason === reason);
            if (works.length === 0) return null;
            return (
              <div key={reason}>
                <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">
                  {t.offMapReason[reason]}
                </h4>
                <ul className="space-y-1.5">
                  {works.map((work) => (
                    <li key={work.title} className="rounded-item bg-white/5 px-3 py-2">
                      <p className="text-sm/snug">
                        {ja ? work.titleJa : work.title}
                        {work.years && (
                          <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                            {work.years}
                          </span>
                        )}
                        {work.removed && (
                          <span className="ml-1.5 rounded-full border border-white/15 px-1.5 py-px text-[10px] whitespace-nowrap text-muted-foreground">
                            {t.offMapRemoved}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        → {ja ? work.until.ja : work.until.en}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
