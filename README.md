# Rotary Club of Ikh Urgoo — rciu.org

The public website and member/admin area of the Rotary Club of Ikh
Urgoo (RCIU), Ulaanbaatar, Mongolia — District 3450.

Next.js (static export) + Supabase + GitHub Pages — same architecture as
mhida.org. **Working on the code with Claude Code? Read
[`CLAUDE.md`](CLAUDE.md) first** — it has the conventions and the
gotchas already learned the hard way.

## What's on the site

**Public pages**
- **Home** — what the club does with "Join us" / "Our projects"
  buttons and live club stats, the next event (with "Add to
  calendar"), latest news (including Facebook post embeds), featured
  projects, an "Our impact" infographic (flight map with countries and
  km from the travel map, icon rows for up to 3 numbers typed in
  Admin → Settings, years of service since 2012), a photo
  gallery that opens photos full size, partners. One
  Rotary wheel turns slowly in the corner and changes colour from
  section to section.
- **About** — club history, honor roll (Paul Harris Fellows), "Where
  We've Traveled" world map, charter certificates, links to Board and
  Members.
- **News** and **Projects** — lists plus a page per item
  (`/news/<id>/`, `/projects/<id>/`) whose shared links preview with
  the item's own title and photo, with Facebook / share / copy-link
  buttons; Projects also has a "Join a Project" partnership form.
- **Events** — monthly calendar with "Add to calendar" (Google /
  Apple / Outlook) on upcoming events. Members are emailed a reminder
  automatically at 09:00 one week before and one day before each event.
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
  Join / Project Inquiries, Members (incl. appointing admins), Settings
  (contact phone, "Our impact" numbers, theme banner).

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
  submitted) and `send-event-reminder` (the automatic week-before and
  day-before reminders,
  plus the "Send Reminder" button in
  Admin → Calendar). Setup notes: the comment at the top of
  `supabase/functions/notify-inquiry/index.ts`, and
  `supabase/functions/send-event-reminder/DEPLOY_INSTRUCTIONS.md`.
- **Spam protection** on the public forms: a database rate limit plus a
  hidden bot-trap field (migration26).
- **Visitor statistics:** Cloudflare Web Analytics (no cookies). Turned
  on by the token in `src/lib/analytics.ts`; the numbers are in the
  Cloudflare dashboard → Analytics & Logs → Web Analytics.

## Deploying

**Pushing to `main` deploys to the live site within about a minute** —
there is no staging site. Make changes on a branch, open a pull request,
and merge when ready.

- `.github/workflows/build-check.yml` lints and builds every pull
  request — a red ✗ on the pull request means the change would break the
  site (or has lint errors); don't merge it.
- `.github/workflows/deploy.yml` builds and publishes on every push to
  `main`, and also **whenever news or projects are published or changed**
  in Admin (a Supabase trigger asks GitHub to rebuild — migration28), so
  their link-preview pages are live about a minute later. Wait that
  minute before sharing a brand-new post on Facebook — Facebook caches
  the first preview it sees. An hourly scheduled rebuild is kept as a
  fallback (GitHub often runs it late), and you can always run the
  deploy by hand: GitHub → Actions → Deploy to GitHub Pages → Run
  workflow.

  The trigger needs a GitHub token stored in Supabase Vault (never in
  this repo). To set it up or replace an expired one:
  1. GitHub → your profile picture → **Settings** → **Developer
     settings** → **Personal access tokens** → **Fine-grained tokens** →
     **Generate new token**. Repository access: only `rciu.org`.
     Permissions → Repository permissions → **Actions: Read and write**.
     Copy the token (it starts with `github_pat_`).
  2. Supabase → **SQL Editor**, run this with your token in place of
     `PASTE_TOKEN_HERE` (running it again replaces the old token):
     ```sql
     do $$
     declare existing uuid;
     begin
       select id into existing from vault.secrets where name = 'github_rebuild_token';
       if existing is null then
         perform vault.create_secret('PASTE_TOKEN_HERE', 'github_rebuild_token', 'GitHub token: lets Supabase start the rciu.org rebuild');
       else
         perform vault.update_secret(existing, 'PASTE_TOKEN_HERE');
       end if;
     end $$;
     ```
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
