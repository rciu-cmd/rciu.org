# RCIU website (rciu.org) — project notes for Claude Code

This is the Rotary Club of Ikh Urgoo's public website. Read this before
making changes — it captures conventions and gotchas learned the hard
way in earlier work on this project (much of it done with me in Cowork,
a cloud-based Claude session, before this local Claude Code setup).

## Stack

- Next.js 16 (App Router), **static export** (`output: "export"` in
  `next.config.ts`) + React 19 + TypeScript + Tailwind CSS v4.
- Supabase for the database, auth, storage, RLS, and two Edge Functions
  (`supabase/functions/notify-inquiry`, `supabase/functions/send-event-reminder`).
- Hosted on **GitHub Pages** behind the custom domain `rciu.org` (DNS on
  Cloudflare). `.github/` has the deploy workflow.
- 5 languages throughout: Mongolian (primary), English, Japanese,
  Chinese, Korean — via `t(mn, en, ja, zh, ko)` from `useLanguage()`
  (`src/lib/language-context.tsx`). Japanese/Chinese/Korean often fall
  back to English where no real translation has been supplied yet
  (Korean was added later, so many older `t()` calls only pass 4 args).
  First visit shows the browser's primary language if supported, else
  Mongolian; a flag click (footer) is saved and wins after that.
  `<html lang>` follows the current language. `t()` never returns blank
  while any version has text (empty MN falls back to EN and vice versa),
  so DB content filled in only one language still shows.

## ⚠️ Pushing to `main` deploys to the live site immediately

There is no staging environment and no manual "deploy" step — the
GitHub Actions workflow builds and publishes to rciu.org as soon as a
commit lands on `main`. Treat every push as a production deploy:
run `npm run build` locally first and actually look at the diff before
committing, especially for anything touching Supabase RLS or the admin
pages. Don't commit or push without the user's go-ahead unless they've
told you otherwise — ask first if it's not clear.

## Local development

```
npm install
npm run dev
```

No `.env` file is needed — the Supabase URL and public anon key are
hardcoded in `src/lib/supabase-config.ts` (both are safe to ship client-side;
real access control is entirely via RLS policies in the database, not
by hiding these values).

Before considering a change done, run `npm run build` (not just
`next dev`) — static export can surface issues (e.g. `useSearchParams()`
needing a `<Suspense>` boundary) that don't show up in dev mode.

## Database changes: SQL goes in chat, not just in a migration file

Claude Code cannot run SQL against Supabase directly (no DB
credentials/psql access from here) — the user runs it themselves in
Supabase's Dashboard → SQL Editor. So for any schema/RLS change:

1. Write it as a new `supabase/migrationNN_description.sql` file
   (next number is 29 — 28 migrations exist so far).
2. **Also paste the SQL directly in chat**, not just save the file, so
   the user can copy-paste it into the SQL Editor without having to go
   find the file.
3. Update `supabase/schema.sql` to match, so a fresh database (or
   anyone reading the schema) reflects the current policies —
   `schema.sql` is the source of truth for a from-scratch setup;
   the numbered migrations are the applied history on the live DB.

The user is non-technical with Supabase's dashboard — when a step
happens there (not in code), give literal numbered instructions, not
"just update the RLS policy."

## Known gotchas (already hit these once — don't re-discover them)

- **Timezone bug**: never use `d.toISOString().slice(0,10)` for a
  local-calendar-day comparison. Ulaanbaatar is UTC+8, so that silently
  shifts dates backward a day. Use `localYmd()` from `src/lib/date.ts`
  instead (uses `getFullYear/getMonth/getDate`, not UTC).
- **Supabase Edge Functions + CORS**: the "Verify JWT with legacy
  secret" toggle, when ON, blocks the browser's CORS preflight
  `OPTIONS` request before the function's own code runs — even if the
  function does its own manual auth check internally. Must be OFF for
  any function called via `supabase.functions.invoke()` from the
  browser.
- **RLS scope**: `project_media` (public project photo galleries — home
  page, `/projects`, `/projects/view`) must stay `using (true)` /
  fully public. `club_photos` (member-only Photo Library) is
  intentionally restricted (featured/visible-to-members/own-upload/
  admin). Don't apply `club_photos`'s restriction model to
  `project_media` again — that broke every public project gallery once
  already (see migration24's comment for the full story).
- **Storage bucket `rciu-photos`** is public, so photo URLs load for
  everyone with no policy check. Its `storage.objects` SELECT policy
  only governs list/remove/move and must stay own-uploads + admins —
  a SELECT-for-everyone policy lets anyone list every file, member-only
  photos included (fixed in migration26).
- **Public inquiry forms** (`/join`, "Join a Project" on `/projects`)
  have a DB rate-limit trigger (migration26) plus a hidden honeypot
  field (`src/lib/spam-guard.tsx`). Any new public, no-login form
  should use the same pattern — each inquiry emails three officers.
- **Resend email**: sending to anyone other than the account owner
  requires a verified domain (resend.com/domains, SPF+DKIM+DMARC via
  Cloudflare) — otherwise every send 403s with a sandbox-mode error.
- **Tailwind v4 important modifier**: `!utility` (e.g. `!aspect-auto`)
  compiles to `aspect-ratio:auto!important` and correctly overrides a
  conflicting utility class regardless of source order — confirmed by
  inspecting the compiled CSS in `out/_next/static/chunks/*.css` if
  ever in doubt again.
- **Facebook Post Plugin embeds** (`src/app/page.tsx` News cards,
  `.fb-post` divs) render at their own natural height based on post
  content — you cannot pin that height with your own CSS like you can
  an `<img>`+text card. Current approach: cap the card at the same
  fixed height as the other cards, `overflow-hidden` + a bottom
  gradient fade, plus an explicit "View full post on Facebook →" link
  so nothing is actually lost.
- **Detail pages come in two forms.** `/news/<id>/` and
  `/projects/<id>/` are built per item at build time
  (`generateStaticParams` + `src/lib/share-data.ts`) so link previews
  (Facebook etc.) show each item's own title/photo; site links use these.
  `/news/view/?id=` and `/projects/view/?id=` (query string +
  `<Suspense>` for `useSearchParams()`) load any item live — including
  ones published after the last build, which the 404 page's inline
  script forwards there. Both render the same `NewsDetail` /
  `ProjectDetail` component. New items get their page because a
  Supabase trigger (migration28) starts the deploy workflow via
  `workflow_dispatch` whenever published news / projects / project
  photos change; the hourly schedule is only a fallback (GitHub runs it
  hours late). A static export fails to build a `[id]` route with
  zero params, so `staticParams()` emits a noindex `_` placeholder when
  there's no data (e.g. Supabase unreachable during the build).
- **Errors on public/member pages** go through `friendlyError()`
  (`src/lib/friendly-error.ts`) with the raw error `console.error`ed;
  admin pages show raw errors on purpose.
- **Automatic event reminders** (migration27): pg_cron calls the
  `send-event-reminder` Edge Function daily at 01:00 UTC (09:00 UB) with
  `{"mode":"auto"}` — no login, so that mode must stay harmless to call:
  it only emails about events exactly 7 days and 1 day away
  (`AUTO_REMINDERS` in the function) and claims each one first via a
  unique index (`event_reminders` (event_id, kind) for kinds
  'week_before' / 'day_before'), so repeat/concurrent calls send nothing. Edge Function code changes must
  be deployed by the user (Dashboard → Edge Functions → Code → Deploy,
  or the CLI) — merging to `main` doesn't deploy them.
- **Rebuild-on-publish** (migration28): `request_site_rebuild()` is a
  security-definer trigger that reads the GitHub token from Supabase
  Vault (`github_rebuild_token`) and calls the GitHub API via pg_net.
  It swallows all errors on purpose so saving a post can never fail
  because of it. In PL/pgSQL, don't combine a table check and a column
  reference in one `and` (no guaranteed short-circuit) — nest the `if`.
- **Home page layout** (`src/app/page.tsx`): one spinning Rotary gear
  for the whole page (`src/components/HomeGear.tsx`, `position: fixed`)
  that changes colour per section via `data-gear="gold|cranberry|…"` on
  each section (and the footer). It paints above section backgrounds,
  so every section's content wrapper must be `relative z-10` or the
  gear draws over its text; the footer and ThemeStrip are layered the
  same way. News / Projects / Photos are grids with no sideways
  scrolling: columns and how many cards to show per breakpoint come
  from `NEWS_GRID` etc. + `useBreakpoint()`/`fullRows()`
  (`src/lib/use-breakpoint.ts`), which trims to whole rows. Gallery
  tiles open a full-size viewer (the original photo, never resized).
  The "Our impact" band never shows money amounts (club's decision):
  countries visited + km traveled are counted from `member_travels`
  (`src/lib/travel.ts`, the same math as the About page's map; trips
  inside Mongolia add no country), years of service from the June 2012
  charter, plus up to 3 numbers typed in Admin → Settings (stored as
  JSON in `site_settings` key `impact_stats` — `src/lib/impact.ts`).
- **Search & sharing**: Google renders the pages in English (browser
  language), so Mongolian only reaches search through metadata — page
  titles are "Мэдээ · News" style and descriptions carry both
  languages. `/sitemap.xml` is generated at build time
  (`src/app/sitemap.ts`, includes every news/project page — there is no
  `public/sitemap.xml`). Club details for Google are JSON-LD in
  `src/app/layout.tsx`. Pages without their own photo share
  `public/logos/rciu-share.png` (1200×630, made from the club's
  artwork); news/project pages have Facebook / phone-share / copy-link
  buttons (`src/components/ShareButtons.tsx`) that always share the
  per-item `/news/<id>/` URL.
- **Visitor statistics**: Cloudflare Web Analytics beacon in
  `src/app/layout.tsx`, token in `src/lib/analytics.ts` (empty = off).
  rciu.org is DNS-only (grey cloud) on Cloudflare, so automatic
  injection doesn't apply — the script tag is required.
- **Pull requests** run `.github/workflows/build-check.yml` (`npm ci` +
  `npm run lint` + `npm run build`) — keep lint at zero problems.
  `react-hooks/set-state-in-effect` can't see async boundaries, so it
  flags `useEffect(() => { refresh(); }, [])` even when `refresh()`
  awaits before setting state; those call sites carry a one-line
  `eslint-disable-next-line` with that reason. Only use it when the
  function really awaits first — the rule is right about synchronous
  setState in an effect.
- **GitHub Actions versions**: checkout/setup-node v7, configure-pages
  v6, upload-pages-artifact v5, deploy-pages v5 (all Node 24). Before
  bumping, check the action's `action.yml` at the new tag for the inputs
  we pass — a bad version in `deploy.yml` only shows up after merging.

## Where things stand

Core site + admin dashboard (news, projects, events, members, gallery,
awards, board, travel, join/project inquiries) are built out; README.md
has the full feature list. Recent work (Oct 2026):
private photo-bucket listing + inquiry-form spam guard (migration26),
keep-alive that pings Supabase, browser-language first visit, sitemap /
page titles / 404 page, "Add to calendar" on events, missing-translation
fallback in `t()`, README rewrite, lighter icons, per-item link-preview
pages + hourly rebuild, friendly errors, pull-request build check,
automatic week-before + day-before event reminders (migration27), Cloudflare Web
Analytics hook, rebuild-on-publish trigger (migration28), Admin → News edit button,
lint at zero + in the PR check, Actions on Node 24 versions, Next.js
16.3.8 (npm audit clean), compact home page redesign (one colour-changing
gear, grids, hero buttons, next-event card, gallery viewer), bilingual
search titles, generated sitemap, wide share image, share buttons,
"Our impact" numbers band.
