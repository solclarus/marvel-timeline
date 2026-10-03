import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="ghost" size="icon" className="rounded-full" aria-label="About" />}
      >
        <Info className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Marvel Timeline</DialogTitle>
        <DialogDescription className="mt-1">
          An unofficial map of how Marvel films and series connect, to help decide what to watch
          before what.
        </DialogDescription>

        <div className="mt-5 space-y-5">
          <Section title="Data">
            <p>
              Release dates and posters come from{" "}
              <a
                href="https://www.themoviedb.org/"
                className={linkClass}
                target="_blank"
                rel="noreferrer"
              >
                TMDB
              </a>
              . Connections between works and Earth designations are compiled by hand; Earth numbers
              not stated on screen follow the Marvel Database.
            </p>
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
              <img
                src={`${import.meta.env.BASE_URL}tmdb-logo.svg`}
                alt="TMDB"
                className="h-3 w-auto shrink-0"
              />
              <p className="text-xs text-muted-foreground">
                This website uses TMDB and the TMDB APIs but is not endorsed, certified, or
                otherwise approved by TMDB.
              </p>
            </div>
          </Section>

          <Section title="Rights">
            <p>
              This is a fan project, not affiliated with or endorsed by Marvel, Disney, Sony
              Pictures, Netflix, or 20th Century Studios. Titles, characters, and logos are
              trademarks of their owners; posters are © their respective studios and are shown via
              TMDB to identify each work.
            </p>
          </Section>

          <Section title="License">
            <p>
              The source code is released under the MIT License. It does not cover the titles,
              posters, or trademarks above.{" "}
              <a href={REPO_URL} className={linkClass} target="_blank" rel="noreferrer">
                View on GitHub
              </a>
            </p>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
