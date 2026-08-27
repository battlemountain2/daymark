# Daymark

A one-page dashboard: what's due, what's next, what matters.

Built for one person — a UNM student in Albuquerque — and deliberately not
general-purpose. It reads assignments from Canvas, weather from the National
Weather Service, and keeps your ticks and to-dos in a database so checking
something off on your phone shows up on your laptop.

Runs free on Vercel. No scheduled jobs, no machine of yours has to stay awake.

---

## Getting it running

### 1. Install

```bash
npm install
```

### 2. Run setup

```bash
npm run setup
```

Asks for a passphrase and your Canvas feed URL, generates a `SESSION_SECRET`
on your machine, and writes `.env.local`.

**The secret never leaves your computer, and it shouldn't.** Same for the Canvas
feed URL — anyone holding it can read your whole assignment schedule. Neither
belongs in a chat window, a screenshot, or a commit.

### 3. Your Canvas feed

canvas.unm.edu → **Calendar** → **Calendar Feed** (bottom right). Paste it when
setup asks, or edit `CANVAS_ICS_URL` in `.env.local` afterwards.

### 4. Storage

Setup defaults to `file:local.db` — a plain SQLite file. **No signup, works
immediately.** Good enough for running locally on one machine.

You only need a hosted database when you deploy, because Vercel's filesystem is
ephemeral and a `file:` database there would lose your ticks on every deploy.
When you get there, see *Deploying* below.

### 5. Run it

```bash
npm run dev      # http://localhost:3000
```

You'll get a passphrase prompt, then the dashboard.

---

## Deploying to Vercel

Once this is live you can open it from campus on your phone, and your laptop can
be shut. Free tier throughout. Roughly fifteen minutes.

### 1. A hosted database

Vercel's filesystem is ephemeral, so a `file:` database there loses every tick
on each deploy. You need a hosted one.

**Use the Vercel Marketplace.** Turso Cloud is listed there, it has a free plan,
and it injects `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` — the exact two names
this app reads — straight into the project. No separate signup, and no copying a
token between browser tabs.

In the Vercel project: **Storage -> Browse Marketplace -> Turso**, pick the free
plan, connect it to this project. Done.

Tables are created on first use. Nothing to migrate.

> Doing it manually instead? Sign up at [turso.tech](https://turso.tech), create
> a database, copy the `libsql://` URL and create a token. If you want the CLI,
> the working formula is `brew install tursodatabase/tap/turso` — plain
> `brew install turso` pulls a different formula that fails on an untapped
> `libsql/sqld` dependency.

### 2. Push to GitHub

```bash
git init
git add -A
git commit -m "Personal dashboard"
```

`.gitignore` already excludes `.env.local`, so your passphrase, session secret
and Canvas feed URL stay off GitHub. **Verify that before you push:**

```bash
git ls-files | grep -c "env.local"    # must print 0
```

Then make an empty repo on GitHub — **private**, this is your schedule — and run
the two `git remote add` / `git push` lines it shows you.

### 3. Import into Vercel

[vercel.com/new](https://vercel.com/new) -> import the repo -> **Deploy**.

The first build succeeds but the app won't work yet, because it has no
environment variables. That's expected.

### 4. Environment variables

Vercel does **not** read your `.env.local`. In the project go to
**Settings -> Environment Variables**. The **Import .env** button takes the file
directly — on macOS press **Cmd+Shift+.** in the file picker to see dotfiles.

`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are already set by the Marketplace
integration, so **delete those two rows from the import** rather than
overwriting a working connection string with `file:local.db`. Drop the empty
ones too (`CANVAS_API_TOKEN`, the `SPOTIFY_*` three). That leaves:

| Variable | Value |
| --- | --- |
| `APP_PASSPHRASE` | your passphrase |
| `SESSION_SECRET` | the one already in your `.env.local` |
| `CANVAS_ICS_URL` | your Canvas feed URL |
| `LAT` / `LON` | `35.1064` / `-106.632` |
| `NWS_USER_AGENT` | `daymark (your@email)` |

Then **Deployments -> ... -> Redeploy** so they take effect.

### 5. Put it on your phone

Open the URL, sign in once, then **Share -> Add to Home Screen**. It installs
with an icon and opens without browser chrome.

The session cookie lasts 90 days, so one sign-in per device covers the semester.
On iOS a home-screen app keeps storage separate from Safari, so it asks once
more there even though Safari is already signed in.

### Keeping it updated

```bash
git add -A && git commit -m "..." && git push
```

Vercel rebuilds on every push. No CLI needed.

---

## Updating

Extract over the existing folder, then **prune**:

```bash
tar xzf hey-brayan-vNN.tar.gz
cd hey-brayan
npm run prune     # removes files deleted upstream
npm install
npm run build     # confirm before deploying
vercel --prod
```

`tar x` only adds and overwrites — it never deletes. Without the prune step,
every file ever removed upstream stays on disk forever, and Next typechecks
everything under `src/` whether or not anything imports it. A stale route left
behind by a rename once broke the build on Vercel while passing locally, with an
error pointing at a file that no longer existed in the source.

`npm run prune` compares the tree against `MANIFEST.txt` and removes the
leftovers. It only ever touches `src/` and `public/`.

---

## Notifications

Three a day, and two channels that stay silent unless something changed.

| When | What |
| --- | --- |
| ~7am | Weather, your classes, what's due, leave-by time if it's tight |
| ~1h before your first class | Only the first one, only on days you have one |
| ~9pm | Tomorrow's shape, what's due, the week's load if it's stacking up |
| *(rare)* | Something new or moved in Canvas |
| *(rare)* | Weather worth knowing — a freeze, a storm, a 25° swing |

### Setup

**1. Generate keys** (they never leave your machine — do not paste them anywhere
but Vercel). This one needs no dependencies, so it works straight after
extracting:

```bash
npm run gen-vapid
```

Add the four values it prints to Vercel → Settings → Environment Variables, then
redeploy.

**2. Turn them on** — open the dashboard and press *Turn on* at the bottom.

> On iOS this only works if the dashboard is **installed to your home screen**.
> Safari tabs cannot receive push. The button tells you if that's the problem.

**3. Set up the scheduler.** Vercel's Hobby plan caps cron jobs at once per day
with ±59 minutes of slop, which can't serve "an hour before your first class".
A free external pinger every 15 minutes does.

`.github/workflows/notify.yml` is ready to go — push this repo to GitHub and add
two repository secrets: `DASHBOARD_URL` (your Vercel URL) and `CRON_SECRET`
(the same value you put in Vercel). Or point [cron-job.org](https://cron-job.org)
at `/api/cron/notify` with an `Authorization: Bearer <CRON_SECRET>` header.

The endpoint refuses anything without that header, so nobody who stumbles on the
URL can make your phone buzz.

**Verify it works** without waiting for 7am:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://your-app.vercel.app/api/cron/notify?test=1"
```

It answers with how many devices it reached. `{"sent":0}` means nothing is
subscribed yet — you pressed *Turn on* somewhere the subscription didn't save,
or you're testing before enabling it on that device.

---

## On the Canvas API

There is code in `src/lib/canvas.ts` for the Canvas REST API, which would add
real submission status and grades. **UNM does not allow personal access
tokens**, so it cannot be used on your account. The ICS feed is the whole story,
and you tick things off yourself.

Left in place in case the policy changes.

---

## What it does

- **A sky that matches the sky.** Full-bleed behind the whole page: real sun and
  moon positions, procedural stars, drifting cloud, and rain that falls *in
  front of* your content. The interface goes dark when the sun sets.
- **Drag the sky through the day.** The slider under the weather runs the scene
  from midnight to midnight — same solar maths as the sun panel, so sunset lands
  at its real bearing.
- **`/weather`** — the full hourly run (NWS gives ~156 periods), rain timing in
  plain language, sun path and moon detail.
- **Tonight's sky** — planets and bright stars actually above the horizon, from
  your coordinates.
- **What's new** — RSS across music, games, TV/film and tech.
- **Semester** — fall break, finals, term progress.
- **Works offline** — opens instantly on bad campus wifi and shows the last good
  copy with an honest staleness banner.

## What's in here

```
src/lib/schedule.ts    Your seven courses, term dates, fall break,
                       open-block detection, the leave-by-now nudge
src/lib/canvas.ts      ICS parsing; optional REST API for grades
src/lib/weather.ts     api.weather.gov + sunrise/sunset computed locally
src/lib/mail-score.ts  Mail ranking (written, not wired up — see below)
src/lib/shuffle.ts     Deterministic daily shuffle
src/lib/db.ts          Turso: ticks, dismissals, your own to-dos
src/lib/auth.ts        One passphrase, signed cookie
```

`CLAUDE.md` has the design decisions and the traps. Read it before changing
things — several of them cost real debugging time to find.

---

## Not done yet

**Mail.** `mail-score.ts` is complete and typechecks: it ranks by what a message
costs you to ignore rather than by keywords in the subject line. What's missing
is a Microsoft Graph app registration and an OAuth flow — the one integration
with genuine setup friction, which is why it's not in v1.

**Grades.** `fetchSubmissions()` already returns scores and workflow state when a
Canvas token is set. Nothing surfaces it in the UI yet.

**End of term.** After Dec 12 the schedule empties out and says so, but doesn't
do anything more useful than that.
