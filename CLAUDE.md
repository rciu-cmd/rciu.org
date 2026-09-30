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
- 4 languages throughout: Mongolian (primary), English, Japanese,
  Chinese — via `t(mn, en, ja, zh)` from `useLanguage()`
  (`src/lib/language-context.tsx`). Japanese/Chinese often fall back to
  English where no real translation has been supplied yet.

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
hardcoded in `src/lib/supabase.ts` (both are safe to ship client-side;
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
   (next number is 26 — 25 migrations exist so far).
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
- Detail pages (`/news/view/?id=`, `/projects/view/?id=`) use a
  query-string + `<Suspense>` pattern for static-export compatibility
  with `useSearchParams()` — follow that pattern for any new detail
  page rather than a dynamic route segment.

## Where things stand

Core site + admin dashboard (news, projects, events, members, gallery,
awards, board, travel, join/project inquiries) are built out. Most
recent work: home page News/Projects card-height consistency (fixed
370px cards) and giving admins a way to delete duplicate
"Send Reminder" log entries from Admin → Events (migration25).
