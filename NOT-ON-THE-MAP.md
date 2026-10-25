# What's on the map, and what isn't

The map answers one question: what to watch before what. A work belongs on it when it changes that answer, not just because Marvel made it.

## The rules

1. **MCU canon is always on the map**: every Marvel Studios and Marvel Television work, even one that stands alone (Moon Knight, Werewolf by Night).
2. **Anything else has to reach the MCU through a line on the map**: a sequel, a prequel, a crossover, or a reference. Deadpool & Wolverine brings back the Blade films and Elektra; No Way Home brings back the earlier Spider-Men. A work two steps away (the predecessor of something that isn't on the map) stays off.
3. **A series that's on the map keeps its main line**: once one Fox X-Men film is tied in, the rest of the films come with it. Spin-offs in another medium don't.
4. **Announced works come on once they have an official title and at least a year.**
5. **Shorts and extras stay off** (web series, behind-the-scenes), unless a work on the map builds on one.

`pnpm test` checks rule 2: every work outside the MCU has to connect to it.

## Bringing a work in

When a new film or series ties one of these to the map, move it out of this list and into `src/data/works.ts` with the work it ties to in `dependsOn`, then run `pnpm fetch:runtimes`. Works taken off the map are still in git history with their full data: `git show 59762a9:src/data/works.ts`.

## Taken off the map

These were on the map without any line to the MCU.

| Work                             | Japanese title                     | Year      | TMDB         | Would come back if                                                     |
| -------------------------------- | ---------------------------------- | --------- | ------------ | ---------------------------------------------------------------------- |
| Hulk                             | ハルク                             | 2003      | movie/1927   | an MCU work brings back Eric Bana's Hulk                               |
| Ghost Rider                      | ゴーストライダー                   | 2007      | movie/1250   | an MCU work brings back Nicolas Cage's Ghost Rider                     |
| Ghost Rider: Spirit of Vengeance | ゴーストライダー2                  | 2011      | movie/71676  | as above, with the first film                                          |
| Fantastic Four (2015)            | ファンタスティック・フォー（2015） | 2015      | movie/166424 | an MCU work brings back its Fantastic Four                             |
| The Punisher (1989)              | パニッシャー（1989）               | 1989      | movie/8867   | an MCU work brings back its Punisher                                   |
| The Punisher (2004)              | パニッシャー（2004）               | 2004      | movie/7220   | as above                                                               |
| Punisher: War Zone               | パニッシャー：ウォー・ゾーン       | 2008      | movie/13056  | as above                                                               |
| Legion — Seasons 1–3             | レギオン                           | 2017–2019 | tv/67195     | a work on the map ties into Legion                                     |
| The Gifted — Seasons 1–2         | ギフテッド 新世代X-MEN誕生         | 2017–2018 | tv/69629     | a work on the map ties into The Gifted                                 |
| X-Men '97 — Seasons 1–3          | X-MEN '97                          | 2024–2027 | tv/138502    | X-Men: The Animated Series comes on, or the MCU crosses into its world |
| Spider-Noir                      | スパイダー・ノワール               | 2026      | tv/220102    | it ties into the Spider-Verse films or the MCU                         |

## Never added

| Work                                                                                                                                                                  | Year              | TMDB    | Why not                                                           | Would come in if                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| X-Men: The Animated Series                                                                                                                                            | 1992–1997         | tv/4574 | X-Men '97 continues it, but neither is on the map (rule 2)        | a work on the map crosses into its world (Earth-92131) |
| Spider-Man: The Animated Series                                                                                                                                       | 1994–1998         |         | shares X-Men: The Animated Series' world, two steps away (rule 2) | as above                                               |
| Armor Wars                                                                                                                                                            | TBA               |         | no date yet (rule 4)                                              | it gets a year                                         |
| Untitled Nova film                                                                                                                                                    | TBA               |         | no title or date yet (rule 4)                                     | it gets both                                           |
| Untitled Shang-Chi sequel                                                                                                                                             | TBA               |         | no title or date yet (rule 4)                                     | it gets both                                           |
| Marvel Zombies: The Winter Soldier, The Fist of Khonshu, The Last Guardian                                                                                            | 2027–2029         |         | listed on Wikipedia, not yet confirmed here (rule 4)              | Marvel confirms the titles and years                   |
| Zodiac                                                                                                                                                                | 2028              |         | not yet confirmed here (rule 4)                                   | Marvel confirms it                                     |
| Your Friendly Neighborhood Spider-Man — Seasons 3–4                                                                                                                   | 2028–2029         |         | poorly sourced so far (rule 4)                                    | Marvel confirms them                                   |
| Agents of S.H.I.E.L.D. web series (Declassified, Double Agent, Academy, Slingshot), WHIH Newsfront, The Daily Bugle                                                   | 2013–2021         |         | extras (rule 5)                                                   | a work on the map builds on one                        |
| Howard the Duck                                                                                                                                                       | 1986              |         | no line to the MCU (rule 2)                                       | an MCU work brings it back                             |
| Captain America                                                                                                                                                       | 1990              |         | no line to the MCU (rule 2)                                       | as above                                               |
| The Fantastic Four                                                                                                                                                    | 1994 (unreleased) |         | no line to the MCU (rule 2)                                       | as above                                               |
| Man-Thing                                                                                                                                                             | 2005              |         | no line to the MCU (rule 2)                                       | as above                                               |
| Live-action TV of the 1970s–2000s (The Incredible Hulk, The Amazing Spider-Man, Doctor Strange, Nick Fury: Agent of S.H.I.E.L.D., Generation X, Blade: The Series, …) | 1977–2006         |         | no line to the MCU (rule 2)                                       | an MCU work brings one back                            |
| Other Marvel animation (X-Men: Evolution, The Spectacular Spider-Man, The Avengers: Earth's Mightiest Heroes, M.O.D.O.K., Hit-Monkey, …)                              |                   |         | no line to the MCU (rule 2)                                       | an MCU work crosses into its world                     |
