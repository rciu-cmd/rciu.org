# Rotary Club of Ikh Urgoo — rciu.org

The public website and member/admin area of the Rotary Club of Ikh
Urgoo (RCIU), Ulaanbaatar, Mongolia — District 3450.

Next.js (static export) + Supabase + GitHub Pages — same architecture as
mhida.org. **Working on the code with Claude Code? Read
[`CLAUDE.md`](CLAUDE.md) first** — it has the conventions and the
gotchas already learned the hard way.

## What's on the site

**Public pages**
- **Home** — featured projects and photos, latest news (including
  Facebook post embeds), club stats, partners.
- **About** — club history, honor roll (Paul Harris Fellows), "Where
  We've Traveled" world map, charter certificates, links to Board and
  Members.
- **News** and **Projects** — lists plus a page per item
  (`/news/<id>/`, `/projects/<id>/`) whose shared links preview with
  the item's own title and photo; Projects also has a "Join a Project"
  partnership form.
- **Events** — monthly calendar with "Add to calendar" (Google /
  Apple / Outlook) on upcoming events.
- **Board**, **Join** (membership interest form), **Contact**.
- A friendly "page not found" page for broken links.

**Members (login required)**
- **Login** — email + password, or a one-time email link.
- **Dashboard** — own profile, photo uploads, event reminders; themed
  by Paul Harris Fellow level.
- **Members** directory and **Photo Library** (`/gallery`).

**Admins** (`/admin`) — two levels:
- *Editor*: News and Projects only.
- *Super admin*: everything — Calendar, Travel Map, Awards, Board,
  Sponsored Clubs (Interact/Rotaract), Partners, Gallery, History,
  Join / Project Inquiries, Members (incl. appointing admins), Settings.

**Languages** — Mongolian, English, Japanese, Chinese, Korean. Mongolian
and English are fully written; the others fall back to English where no
translation exists yet. First-time visitors get their browser's language
(Mongolian if the site doesn't have it); the flags in the footer switch
and remember the choice.

## How it fits together

- **Hosting:** GitHub Pages, custom domain `rciu.org` (DNS on
  Cloudflare). The site is plain static files — no server.
- **Data, login, photos:** Supabase. All access control is Row Level
  Security in the database (public / member / editor / super admin), so
  the public Supabase URL and key in `src/lib/supabase-config.ts` are safe to
  ship.
- **Email:** two Supabase Edge Functions using Resend —
  `notify-inquiry` (emails officers when a Join / Project form is
  submitted) and `send-event-reminder` (the "Send Reminder" button in
  Admin → Calendar). Setup notes: the comment at the top of
  `supabase/functions/notify-inquiry/index.ts`, and
  `supabase/functions/send-event-reminder/DEPLOY_INSTRUCTIONS.md`.
- **Spam protection** on the public forms: a database rate limit plus a
  hidden bot-trap field (migration26).

## Deploying

**Pushing to `main` deploys to the live site within about a minute** —
there is no staging site. Make changes on a branch, open a pull request,
and merge when ready.

- `.github/workflows/build-check.yml` builds every pull request — a red
  ✗ on the pull request means the change would break the site; don't
  merge it.
- `.github/workflows/deploy.yml` builds and publishes on every push to
  `main`, and also **every hour**, so newly published news and projects
  get their own link-preview page. To share something on Facebook right
  after publishing it, first run the deploy by hand (GitHub → Actions →
  Deploy to GitHub Pages → Run workflow) and wait a minute — Facebook
  caches the first preview it sees.
- `.github/workflows/keep-alive.yml` pings the site and the database
  every 3 days so a free-plan Supabase project doesn't pause.

## Database changes

Database changes are **not** deployed by merging — they are run by hand
in Supabase → **SQL Editor**:

- `supabase/migrationNN_*.sql` — the numbered history of changes
  applied to the live database, in order.
- `supabase/schema.sql` — the full current schema, kept in sync with
  the migrations, for setting up a fresh database from scratch.

### Setting up a fresh database

1. In Supabase → SQL Editor, paste and run `supabase/schema.sql`. It
   creates every table, trigger, RLS policy and the photo storage
   bucket — no real data. Safe to re-run.
2. Import the real member roster and PHF/Major Donor data with the
   private script that is kept **outside** this public repo (the
   `supabase/private/` folder is git-ignored).
3. Create your login in Supabase → **Authentication → Users → Add
   user** (the site has no public sign-up). That automatically adds a
   `pending` row to `public.members`. Then make yourself an active
   super admin:
   ```sql
   update public.members set admin_level = 'super', status = 'active' where email = 'your@email.com';
   ```
   Set `admin_level` (`none` / `editor` / `super`), never `is_admin` —
   that one is kept in sync automatically.

## Local development

```
npm install
npm run dev
```

No `.env` file is needed. Before calling a change done, run
`npm run build` — the static export catches problems that `npm run dev`
doesn't.

## Still to do

- Japanese, Chinese and Korean translations (club to supply).
- Stock / inventory: the admin-only tables exist in the schema, but
  there is no admin page for them yet.
