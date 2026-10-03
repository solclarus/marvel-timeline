import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

const REPO_URL = "https://github.com/solclarus/marvel-timeline";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

const linkClass = "underline underline-offset-2 hover:text-foreground";

// What the site is, where its data comes from, and who owns what: the
// required TMDB notice, the unofficial-fan-project disclaimer, and the
// license. Opened from the command bar; there are no other pages.
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
