# Notes for Claude Code

Context you'd otherwise have to rediscover. Read this before changing anything.

## What this is

A single-user dashboard for Brayan Quinonez, a UNM student in Albuquerque.
One page: what's due, what's next, what matters. It replaces an earlier version
built as a Claude Artifact, which worked but couldn't sync state across devices.

**The whole reason this app has a server is cross-device state.** Ticking an
assignment off on a phone had to show up on the laptop. If a change doesn't
serve that, question whether it needs a backend at all.

## Ground truth about the user

- **Brayan** — `bquinonez@unm.edu` (school, Microsoft 365), `bquinonez223@gmail.com` (personal)
- Albuquerque, NM. `America/Denver`. Campus is UNM main.
- **Fall 2026: seven courses**, six in person plus one online fitness course.
  Term runs **Aug 17 – Dec 12**, fall break **Oct 8–9**.
- The full schedule is in `src/lib/schedule.ts`, hard-coded on purpose — Canvas
  knows about assignments, not about which building he has to walk to.
- The tight spot in his week: Monday/Wednesday, the 9:00 lab ends 10:45 in
  **Bandelier Hall East** and the 11:00 is in **Mitchell Hall**. Fifteen minutes,
  two buildings. `leaveAdvice()` exists for exactly this.

## Decisions that already got made, and why

**Weather is `api.weather.gov`, not the HTML page.** The artifact version scraped
`forecast.weather.gov`, which turned out to be serving data *two days stale*. The
proper API is free and keyless but blocks anonymous clients — `NWS_USER_AGENT` is
required, not decorative.

**Canvas has two sources and only one is required.** The ICS feed needs no auth
and drives everything. The REST API needs a personal access token and adds real
submission status and grades. The app must stay fully useful without the token.

**Never change an assignment's `due` or `title` casually.** Together they form
the localStorage/DB key for ticks — see `assignmentKey()` in `src/lib/canvas.ts`.
The slug deliberately collapses punctuation so `Film 01 Assignment: The
Wilderness Idea` and `Film 01 Assignment - The Wilderness Idea` produce the same
key; Canvas is inconsistent about which it sends. Do not "tidy" that.

**Mail is scored, not keyword-matched.** `src/lib/mail-score.ts` combines signals:
money, an extracted date, addressed only to him, unread, a known UNM office, a
reply he's owed, a person versus a role mailbox. It replaced a single regex that
ranked an automated notice above a professor writing to him directly.

Two things that regex got wrong and the scorer must keep right:
- A **listserv blast still matters** when it carries money and a deadline. The
  A&S scholarship goes to `ARTSCI-L@LIST.UNM.EDU` and is one of the most
  important things in his inbox. The mailing-list penalty stays small on purpose.
- **Canvas sends two different things from one address.** Machine notices
  (`New File Added`, `Assignment Graded`) are noise. Announcements an instructor
  wrote are not — they get a *bonus*. Filtering all of `instructure.com` loses
  his professor explaining a semester-long graded requirement.

**The shuffle steps by a coprime stride.** `src/lib/shuffle.ts`. Walking a sorted
list one index per day is not a shuffle, it walks the alphabet — that was a real
bug. Near-golden-ratio stride visits every item once per cycle and lands far
apart on consecutive days.

**Palettes define every colour on bare `:root` first.** A colour whose only
definition sits inside `@media (prefers-color-scheme: dark)` or a `[data-theme]`
block never applies in the un-stamped "system" state, and the page renders one
theme's text on the other theme's ground. Easy to ship, hard to see.

**The sky is drawn, not fetched.** `src/components/SkyScene.tsx` paints one
canvas: sky gradient from the sun's real elevation, procedural stars, the actual
moon phase, drifting cloud, and rain or snow when the observation says so.
`src/lib/solar.ts` and `src/lib/moon.ts` are pure arithmetic — no key, no
network, correct offline. `SunPanel` and `MoonStrip` render the same numbers as
text. All of it was verified against known astronomy before shipping: full moon
Aug 28 2026 rises 7:53 PM and sets 6:58 AM (a full moon rises at sunset), Sep 4
has *no* moonrise at all, and the solstices come out 14.52h / 9.79h.

**Current conditions beat the forecast in the scene.** A 60% afternoon chance of
rain must not put rain on screen while it is clear outside. `readWeather()`
prefers the live observation and only falls back to the forecast wording above a
40% chance. Precipitation also forces high cloud cover — it does not rain out of
a clear sky, and that cover is what dims the stars.

**The page streams; it does not wait.** `page.tsx` hands the client *unawaited*
promises for weather, Canvas and news, and `Dashboard` unwraps each inside its
own Suspense boundary. The header and the class schedule need no network at all
and used to sit behind a weather API — measured 3179ms before, 76ms after, with
weather arriving on its own. Only `readState()` is awaited, because rendering
to-dos unticked and then correcting them would flash the wrong answer.

**The dashboard is "today". `/sky` is the sky.** The full-bleed sky was briefly
applied to the dashboard and buried it — translucent boxes over a moving
background is a weather app, not a page you scan for what's due. The dashboard's
cards were always chrome-free (an Anton heading over a 2px rule) and that is the
look worth keeping; everything dramatic now lives on `/sky`, scoped by a
`.sky-page` class. The dashboard keeps a compact weather card that links across.

**On `/sky`, the interface follows the sun.** `SkyBackdrop` sets `data-theme`
from the sun's real elevation, so that page goes dark at sunset — and scrubbing
the slider flips it too. Not decoration: light translucent cards over a night
sky give dark text a mid-grey ground and unreadable contrast.

**The accent comes from today's record sleeve.** `AlbumAccent` samples the cover
on a 48px canvas, buckets by hue weighted by saturation squared, and overrides
only `--accent` / `--accent-soft`. It deliberately does not take the most common
colour — sleeves are mostly black, white or beige and averaging gives mud — and
the saturation is capped low, because at full strength a red sleeve stops
looking like a daily shift and starts looking like a different product.

**Music comes from a live source, not a frozen catalogue.** `src/lib/music.ts`
replaced the 76-album `public/albums` collection and the photo band — a museum
of what he owned in August was less interesting than what he played yesterday,
and phone snaps looked poor at dashboard size. Two backends because the first is
fragile: **Last.fm** (`LASTFM_USER` + `LASTFM_API_KEY`, user `adox23`) is where
his history lives but Last.fm suspends keys freely — the first one we tried came
back "API Key Suspended" within minutes. **ListenBrainz** (`LISTENBRAINZ_USER`)
needs no key at all, serves collaborative-filtering recommendations for free, and
can import a full Last.fm history, so it is a real escape hatch. Last.fm wins
when both are set; a Last.fm failure falls through to ListenBrainz.

**Reddit is not integrated, and the blocker is policy not code.** Reddit now
requires registration *and explicit approval* before any API access — creating a
script app is no longer sufficient. My sandbox also blocks reddit.com outright,
so none of it is testable from here. The RSS sources cover his interests
(Phoronix, LWN, OMG Ubuntu, Bandcamp Daily, a hyperpop-scoped news query); revisit
only if he gets approved.

**The orrery and the visibility list share `helio()`.** `solarSystem()` in
`planets.ts` returns heliocentric positions from the same function that decides
whether Jupiter is up tonight, so the two can never disagree. Orbital periods
derived from those semi-major axes via Kepler's third law match published values
for all eight planets within 2%. Radii are compressed by a power law (`au^0.42`)
because linear scaling puts Mercury 78× closer in than Neptune.

**Writes made offline are queued, not lost.** `src/lib/outbox.ts` is an
IndexedDB outbox; `src/lib/apply.ts` mirrors the server's mutations so an edit
registers instantly and survives with no signal. Making the app *readable*
offline without this was actively harmful: the page loaded fine underground and
every tick was silently thrown away. iOS Safari has no Background Sync, so
replay is driven from the page — mount, `online`, tab focus, and a slow
interval.

**`addTodo` is idempotent because at-least-once delivery is real.** A POST can
reach the server and have its *response* lost, and the client — seeing a
failure — replays it. On a simulated flaky connection that reliably produced two
identical to-dos from one offline edit. The client now mints the row id
(`local-…`) and the server uses `INSERT OR IGNORE`, so a replay is a no-op.
Every other action was already idempotent; setting a value twice is setting it
once. **Do not move id generation back to the server.**

**Only one flush runs at a time.** Replay has four triggers, and without the
in-flight guard in `outbox.ts` two of them overlap, read the same queue, and
both POST before either deletes. That duplicated a row in testing too — a
different cause from the one above, with the identical symptom.

**401/403 do not discard a queued write.** They mean the session lapsed, not
that the write is bad; dropping them would throw away real edits the moment a
cookie expired. They stay queued and stop the run. Other 4xx are dropped after
two attempts so they cannot block the queue forever.

**Notifications are three a day, by design.** `src/lib/notify.ts` decides;
`/api/cron/notify` sends. A leave-for-class alert before *every* class is the
thing you stop reading in week two, and once one notification is ignored they
all are — so: a morning brief, one nudge before the day's *first* class, a
nightly look at tomorrow, plus two exception channels (Canvas moved, weather
unusual) that in a normal week never fire. All the decision logic is a pure
function of (time, schedule, weather, work), so it can be tested without
sending anything — see the sweep in the session history that prints exactly
which polls catch which notification.

**Notification windows are hours wide, and that is deliberate.** The poller is
external and best-effort; GitHub Actions routinely runs scheduled jobs late. A
fifteen-minute window polled every fifteen minutes misses entirely on any drift
and the notification silently never arrives — which is what happened on the
first test at 21:22 against a 21:00–21:15 window. The windows are now 7–9am and
9–11pm, and `claimSend(kind, day)` in the database is what prevents repeats:
the first poll inside a window wins the insert, every later one loses. Widening
a window costs lateness, never duplication.

**The notify endpoint is authenticated and must stay that way.** It is
externally callable by design, so without `CRON_SECRET` anyone who found the URL
could make his phone buzz. Compared in constant time, header only — a query
string would land in access logs.

**Offline is a real feature, not a fallback.** `public/sw.js`: build assets are
content-hashed so cache-first forever; albums and photos cache-first with a cap;
the page is network-first with a 3.5s timeout falling back to the last good
copy. `/api/*` is never cached — a stale tick list is worse than an error. The
banner asks `/api/ping` rather than trusting `navigator.onLine`, which reports
true for campus wifi that has no route out.

**Feeds: publishers block datacenter IPs.** Pitchfork, The Verge, Ars Technica,
Polygon, IGN, NPR, Reddit and Eurogamer all 403 anything not coming from a home
browser, and Vercel is a datacenter. `src/lib/feeds.ts` lists only sources
confirmed reachable, plus Google News topic feeds, which carry the blocked
publishers' stories anyway. The User-Agent identifies honestly as a feed reader;
we do not spoof a browser to get around a deliberate block.

**NPR comes in through the podcast feeds, and that is the only door.**
`feeds.npr.org/<topic>/rss.xml` sits behind Akamai and returns a 403 challenge
page to any datacenter IP, with or without a browser User-Agent. The *podcast*
feeds on the same host are served by a different origin entirely and answer 200
— because podcast clients are datacenter-hosted by nature, so NPR cannot block
datacenters without breaking its own distribution. Every id in `feeds.ts` was
checked against the feed's own channel title: several NPR ids point at a
different programme than the obvious guess (510298 is TED Radio Hour, not It's
Been A Minute; 510313 is How I Built This, not Book of the Day).

**A feed that returns 200 with 300 items can still be dead.** The Tiny Desk
audio feed does exactly that, and its newest episode is *1,595 days old*;
Rough Translation is 973. Checking only the status code and the item count
would have shipped a panel of 2022 concerts that looked perfectly healthy.
**Check the newest item's date**, not just that items exist.

**Pitchfork has no second door.** Its own feeds 403 like NPR's topic feeds and
there is no podcast equivalent, so it arrives as a `site:pitchfork.com` Google
News query. That works well because the review headlines keep their format
("Artist: Album Review — Pitchfork") and `parse()` already recovers the real
publisher from the suffix.

**The news list interleaves by source instead of sorting purely by date.**
Hacker News posts every few minutes and NPR ships six shows a day, so a strict
recency sort filled all twelve visible rows with two sources. `interleave()`
takes one item from each source, newest first, then a second from each — the
head of the list is varied and recency still orders each round.

**The dashboard answers one question, in one sentence.** `src/lib/lede.ts` is a
pure function of (clock, term, classes, work, weather) returning a headline, a
sub-line and a tone. It replaced a header that concatenated three independent
facts — weather, then class count, then assignment count — which reads as a list
and leaves the synthesis to the reader. The ladder is ordered by how soon acting
matters: walking time, in class, due today, class coming up, done for the day,
no classes. First match wins. Weather appears only when it would change what you
carry; a line that says "72° and clear" every day is a line you stop reading.

`RightNow` was deleted in the same change — it was an earlier, smaller attempt at
the same idea and rendered a near-identical orange sentence directly beneath the
lede.

**The lede streams in three stages and never blanks.** Clock and term need no
network, so the schedule-only lede renders in the first paint and is already
correct for four of the six rungs; Canvas can only upgrade it, and weather can
only add a trailing clause — it can never change the headline. Nested Suspense
boundaries, with each stage's fallback being the previous stage's complete
answer.

**⌘K is `src/components/CommandPalette.tsx`.** Anything typed that matches no
command becomes a to-do due today, so capture has no separate mode and no second
dialog. It is also openable from a header button, because a keyboard-only
palette is decoration on the phone he actually reads this on. Its mutations go
through the same `mutate` the panels use, so they queue in the outbox offline.

**The astronomy is verified, not assumed.** `src/lib/planets.ts` was checked
against two independent invariants before shipping: Polaris sits at the
observer's latitude to within its own 0.74° offset from the pole (at every
latitude tried), and all five planets' magnitude ranges over four years match
the published ones. The Summer Triangle reads correctly overhead at midnight in
late August.

**The term is data, not source.** It used to be a hard-coded object in
`schedule.ts`, which gave the app an expiry date: on Dec 12 2026 it became a
museum and Spring 2027 needed someone to edit TypeScript. It now lives in the
`settings` table as JSON, is edited at `/term`, and `schedule.ts` keeps only the
`ClassBlock` type and pure helpers — `classesOn(term, iso, dow)` takes the term
rather than reading a module constant.

`DEFAULT_TERM` in `src/lib/term.ts` is the Fall 2026 schedule, kept as both seed
and fallback. **Keep the fallback.** A dead database should leave a correct
schedule on screen, not an empty week — the class schedule is the one thing on
this page that needs no network, and it would be perverse for it to be the first
casualty of a network fault.

`parseTerm()` is lenient about rows and strict about the whole: one malformed
class is dropped, but a term whose end precedes its start is rejected outright,
because that breaks every countdown, the daylight curve and all the
notification windows simultaneously.

**The crunch-week radar weights graded work double.** A week with three readings
is a busy week; a week with three exams is a different kind of week, and telling
them apart is the entire point. Verified against synthetic data: done items and
out-of-term dates are excluded, and the heaviest week is picked by weight rather
than count.

## Traps

**Touch targets.** 16px checkboxes are fine with a mouse and miserable with a
thumb. `globals.css` bumps them under `max-width:560px`, and the responsive rules
sit **last in the file** — an earlier media query loses to a later base rule on
equal specificity. That fix silently didn't take the first time.

**Grid gutters overflow phones.** `repeat(12, 1fr)` with a 36px gap reserves
eleven gutters — about 396px — which is wider than a phone's content area even
when every child spans full width. Collapse to one column under 860px.

**`arcProgress` is clamped, so never reconstruct a clock time from it.**
`sunPosition().arcProgress` pins to 0 or 1 once the sun is down. The Sun panel
originally derived sunrise and sunset by subtracting it from `now`, which looked
plausible by day and printed **10:14 AM / 11:__ PM** at night. Real events come
from `sunEvents()` in `solar.ts`, which uses the equation of time and the
half-day hour angle. It agrees with the weather strip to the minute: 6:31 AM,
7:48 PM.

**Canvas `globalAlpha` accumulates at overlaps.** Filling each cloud blob in its
own `beginPath()`/`fill()` stacks the alpha where blobs overlap, so a soft cloud
renders as a pile of hard discs. Build the whole cloud as one path and fill once.

**Text over the sky scene can't use theme ink.** `--ink` is dark in the light
theme, and at night the scene behind it is nearly black. The overlay forces
near-white plus a scrim (`.skywrap::after`) so it reads at every hour, in every
theme.

**A gap-coloured grid container shows empty tracks as stray blocks.** `.facts`
uses `auto-fit`, so the last row is usually short. With `gap:1px` over a
`--line` background those empty cells rendered as coloured rectangles — the same
class of thing the user once flagged as "weird grey boxes". Dividers are now
borders on the cells and the container is `--surface`.

**`new URL(...).pathname` is percent-encoded.** `scripts/setup.mjs` used it to
locate `.env.local`, so extracting the project into a folder named
`hey-brayan v3` made it try to write to `hey-brayan%20v3` and die with ENOENT.
Use `fileURLToPath()`. Assume user folders contain spaces, because they do.

**Setup never echoes a secret.** The passphrase prompt is muted, the Canvas feed
URL is muted and confirmed back redacted, and a passphrase is only printed when
the script generated it. Terminal scrollback gets copied into places it
shouldn't — this exact echo is how a live passphrase once ended up pasted into a
chat window.

**A threshold above the most common value is a dead feature.** Cloud drawing
was gated at `cover > 0.25`, and "Mostly Clear" — Albuquerque's most frequent
condition — scores exactly 0.2. Nothing was ever drawn, so the daytime sky was a
static gradient and the user reasonably concluded the feature had not shipped.
Cloud count and size now scale with cover instead of a cliff-edge gate.

**The sun was missing from the sky.** `SkyScene` drew a moon and never a sun,
so daylight had no subject at all. Both are now placed by real azimuth and
altitude — east at the left edge, west at the right — which is also why the moon
only appears on nights it is genuinely above the horizon.

**Celestial objects are squeezed into the upper band.** `skyY` maps elevation
into the top 66% of the tile, not the full height. The forecast text owns the
lower half, and anything at low altitude drawn behind it reads as a smudge.

**The scrubber drives the scene through `atRef`, not a prop dependency.**
Putting the scrub time in the effect's dependency array rebuilt the starfield on
every drag frame and made the whole scene strobe.

**A promise handed from a server component to a client one is a thenable, not
a Promise.** It has `.then()`, but `.then()` returns `undefined`, so chaining
`.catch()` onto it throws "Cannot read properties of undefined". `use()` handles
thenables; ordinary chaining does not. Wrap it: `Promise.resolve(p).then(ok, err)`.

**An inline style beats the stylesheet.** `SkyScene` set `style={{height}}` on
its canvas, which overrode `height:100%` and left the full-bleed page sky 128px
tall with page background under the rest of it. The inline height is now applied
only to the tile variant.

**Rendering `new Date()` in a client component is a hydration bug.** The server
stamps one time into the HTML and the browser hydrates at another — React error
#418. Invisible in dev, guaranteed once the service worker serves a cached page
from hours ago. Anything time-dependent starts null and fills in on mount.

**`h1.greet em` is (0,1,2) and beats a bare `.greet em` at (0,1,1)** no matter
which comes later. Match the original selector rather than reaching for
`!important`.

**Grid items default to `min-width:auto`.** They refuse to shrink below their
content, so a 1944px hourly chart inside an `overflow-x:auto` box still pushed
the whole document to 1966px on a 390px phone. `min-width:0` on the card and the
scroll container is what actually makes internal scrolling work.

**Magnitude needs the phase angle.** Computing planetary brightness from
distance alone put Venus at −5.4; it never exceeds about −4.9, because when it
is closest to Earth it is also a thin crescent. The full form is
`H + 5·log10(r·Δ) + c₁α + c₂α² + c₃α³`.

**`browser.newPage()` opens a fresh context with no cookies.** A second page
opened that way is not logged in and silently redirects to `/login`, which looks
exactly like the page under test failing to render. Reuse the page, or use
`context.newPage()`.

**`leaveAdvice()` returns the next class whenever there is one.** It is not a
"time to go" signal by itself — compare `now >= leaveAtMinutes` before treating
it as a nudge, or the banner shouts all morning.

**Slicing a stylesheet between two markers deletes whatever grew between
them.** Scoping the sky CSS by replacing everything from `/* --- full-bleed sky`
to `/* --- weather view` silently removed the news, semester and tonight blocks
that had been appended in between. Nothing errored; the panels just rendered
with browser defaults, which is how the headlines ended up link-blue. When
editing CSS by marker, match a *single* block, or check what the slice contains
first.

**Verify in dark, not just light.** Most of this project's visual checking has
been done in the light palette because that's the default in a headless
browser. Use `browserContext({colorScheme:"dark"})` — several problems here were
only visible there.

**`.planet` was already taken.** The orrery's planet group collided with the
"planet" tag in Tonight's list, so `.planet.dim circle` reached into an unrelated
component. It is `.orb-planet` now. Grep before choosing a class name in a
stylesheet this size.

**A setup script must not need setup.** `scripts/gen-vapid.mjs` imported
`web-push` and so died with ERR_MODULE_NOT_FOUND for anyone who ran it before
`npm install` — which is exactly when you run a setup script. It uses only
`node:crypto` now: a VAPID pair is just a P-256 key, public half as the
uncompressed point `0x04 || X || Y`, private half as the raw scalar, both
base64url. Verified that `web-push` accepts and signs with the result.

**An unused import is not an error.** `PushToggle` was imported into
`Dashboard.tsx` and never rendered — a string-replace that didn't match the
markup. Typecheck passed, the build passed, and the notifications toggle simply
was not on the page. Verify that a new component *renders*, not that it
imports; `grep -c "<Component" ` is the check, not the import line.

**`npm pkg delete` does not touch the lockfile.** Playwright gets installed for
visual checks and removed before packaging; doing that with
`npm pkg delete devDependencies.playwright` edited `package.json` and left
`playwright` sitting in `package-lock.json`. Local `npm install` tolerates the
drift and silently repairs it, but **Vercel runs `npm ci`, which refuses to
install when the two disagree** — so the build passed here and failed there with
no obvious connection to anything recently changed. Always remove with
`npm uninstall <pkg>`, and before packaging verify the two agree.

**Reproduce a Vercel build with `rm -rf node_modules .next && npm ci && npm run
build`.** A plain `npm run build` against an already-populated `node_modules`
cannot catch a missing or mismatched dependency, which is precisely the class of
failure that only shows up in deployment.

**`tar x` never deletes, and Next typechecks files nothing imports.** This
project ships as a tarball extracted over the previous copy, so every file
deleted upstream lingers on the user's disk indefinitely. `src/app/weather/
page.tsx` survived the rename to `/sky` and kept calling `WeatherView` without
the `term` prop added later; Next typechecks every file under `src/` regardless
of whether it is reachable, so the build failed **on Vercel only** — the source
here had no such file — with an error naming a path that does not exist in the
repository. Diagnosing it from the local build was impossible by construction.

`scripts/prune.mjs` plus a `MANIFEST.txt` generated at package time now removes
anything under `src/` and `public/` that is not part of the release. **Regenerate
the manifest (`find src public -type f | sort > MANIFEST.txt`) as the last step
before packaging**, and tell the user to run `npm run prune` after extracting.

**A byte cap needs `abort()`, not `reader.cancel()`.** NPR's podcast feeds run
to 9.5MB and support no range requests, and they are over Next's 2MB
data-cache ceiling — so the fetch cache silently refuses them and *every page
render re-downloaded the lot*, about 20MB a request, announced only by an
easily-missed "items over 2MB can not be cached" log line. The fix is to stop
reading at 256KB, but doing that with `reader.cancel()` **deadlocked the page
for over four minutes, and only inside a real Next server** — plain Node was
fine, so it was invisible until a production build was actually loaded in a
browser. Next instruments `fetch` and something upstream still holds the body.
`AbortController` tears down the whole request and works. Caching then happens
one level up, on the parsed result, via `unstable_cache`. 20MB → 1.5MB,
2005ms → 452ms.

**`data-theme` was being stamped on every page and beat the system setting.**
The pre-paint script in `layout.tsx` exists to stop `/sky` flashing white before
the solar calculation runs, but it ran everywhere and wrote `light` between 6am
and 8pm — so a phone set to dark mode got a *light dashboard every afternoon*
and nothing could override it, defeating the entire
`:root:not([data-theme="light"])` arrangement the stylesheet is built on. It is
now scoped to `/sky` by pathname. `SkyBackdrop` also had to remove the attribute
on unmount, or a client-side nav from `/sky` back to `/` left the dashboard
pinned to whatever the sky page last decided.

**`NewsPanel` called `Date.now()` during render.** "45m ago" server-side, "46m
ago" on hydration, React #418 on essentially every page load — invisible in the
UI, which is why it survived. Relative times take a clock captured in an effect
and render nothing before mount, so server and client agree.

**Two `next` servers share one `.next` and neither works.** Running `npm run
build` while `next dev` is alive leaves `next start` serving a directory dev has
since rewritten: the HTML asks for dev-style chunks (`main-app.js?v=…`), every
one 404s, nothing hydrates, and a login form's submit button stays disabled
forever — which looks exactly like an app bug. Check `ps -eo pid,args | grep
next-server` and kill by **PID**; `pkill -f next` matches its own shell command
line and kills the calling shell instead.

**`page.fill()` beats React to hydration.** It sets the value and fires an input
event before the controlled component is listening, so state never updates and
the form stays disabled. Use a real click plus `keyboard.type()`, and wait for
`button:not([disabled])` rather than a fixed timeout.

**Online classes have nowhere to walk to.** The fitness course is
`where: "Online"`, and every piece of leave-by advice is nonsense for it —
"leave by 9:50am" for a browser tab. `isOnline()` in `schedule.ts` guards this;
`lede.ts` and the before-class notification both check it. It read fine for
months only because that course sits on a Saturday where nothing competes.

**Escapes.** The artifact version generated HTML from a Python template, and `\b`
in a JavaScript regex is Python's *backspace* escape. Eight regexes silently lost
their word boundaries; quiz and exam detection was broken for days and nothing
errored. This project is TypeScript so that specific trap is gone, but the lesson
stands: **a transform that silently succeeds is worse than one that fails.**

**Connector policy.** Third-party connectors get `blocked_by_policy` from
artifact runtimes even when first-party ones work. Not relevant here — this app
uses its own credentials — but it's why the app exists in this shape.

## Where it's going

Still unbuilt, and wanted: the **campus walk forecast** — crossing the class
schedule with the hourly forecast and the sun's azimuth to answer "what is the
Bandelier → Mitchell walk going to be like at 10:45". Everything it needs
already exists (`schedule.ts`, `weather.hours`, `solar.sunPosition`); nobody has
wired them together yet. Also proposed and not chosen: a **grade tracker**
(manual, since UNM blocks Canvas tokens) and a **workload heat map**.

Phase 2 is Outlook mail, via Microsoft Graph. `mail-score.ts` is written and
typechecks; what's missing is an Azure app registration and an OAuth flow. It's
the one integration with real setup friction, which is why it's not in v1.

Phase 3, if wanted: grades. `fetchSubmissions()` already returns score and
workflow state when a Canvas token is present — nothing surfaces it in the UI yet.

## Working agreements

- **Verify before claiming.** Every "it works" in this project's history that
  wasn't checked in a browser turned out to be wrong. `npm run typecheck` and
  `npm run build` both pass right now; keep it that way.
- **Verify visuals by rendering them.** Anything drawn — moon phase, sky, arcs —
  gets a headless Chromium screenshot and an actual look before it counts as
  done. `chromium` lives at `/opt/pw-browsers/chromium`; freeze time with
  `page.clock.install({time})` *before* `goto` and keep it frozen, or the
  animation loop reads the real clock and every scene renders identically. In
  the JS binding the option is `viewport`, **not** `viewportSize` — get that
  wrong and every "mobile" screenshot is silently 1280px wide.
- **Kill every `next` process before re-testing a build.** A server started
  against an older `.next` keeps serving old chunk hashes, and the browser fails
  with `ChunkLoadError: Loading chunk N failed` — which looks like an app bug and
  is not. `pkill -9 -f next`, rebuild, then start with `setsid`.
- **Degrade per-panel.** A dead source greys out its own panel and says why.
  It never blanks the page, and it never shows a generic "something went wrong".
- **State keys are load-bearing.** Changing how a key is derived silently
  destroys the user's ticks. Migrate deliberately or don't touch it.
