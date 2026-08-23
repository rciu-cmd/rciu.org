# Rotary Club of Ikh Urgoo — rciu.org

Next.js (static export) + Supabase + GitHub Pages — same architecture as
mhida.org.

## Status: Phase 1 skeleton

**Built:**
- Project scaffold (Next.js 16, Tailwind 4, TypeScript, static export)
- Full Supabase schema (`supabase/schema.sql`) — members, news,
  projects, board positions, project photo folders, links & partners,
  affiliate clubs (Interact/Rotaract), hidden admin-only stock/inventory
  with a full change history, site settings — all with Row Level
  Security policies (public / member / admin tiers)
- Real official assets: RCIU emblem, wordmark, Rotary International
  gear logo, District 3450 logo (`public/logos/`), charter certificate
  + certificate of organization (`public/certificates/`)
- 4-language support (Mongolian + English written now; Japanese +
  Mandarin scaffolded, falling back to English until you supply real
  translations — see `src/lib/language-context.tsx`)
- Pages: Home, About, News (reads from DB, empty until you publish),
  Projects (same), Board (same), Members (real roster + public PHF
  honor roll), Links & Partners, Contact (real meeting/contact info),
  Member Login (magic link), Member Dashboard (visually themed by PHF
  tier — sapphire gradient for PHF+1..+5, ruby for PHF+6..+8, gold for
  base PHF, with a friendly nudge for non-PHF members)
- GitHub Pages deploy workflow + custom domain (CNAME → rciu.org)

**Not yet built (next steps):**
- Admin dashboard (news posting, project management, member approval,
  board assignment, stock/inventory page)
- Member profile self-editing + photo upload into project folders
- Photo collage report generator (client-side PPTX/PDF export)
- Real board officer titles (only the roster + PHF data was provided —
  send me who holds which role)
- Rotaract club details (Interact's info is in hand; Rotaract's is
  still needed)
- Japanese and Mandarin translations (you're providing these)
- Photo storage wiring (Supabase Storage now; Cloudflare R2 path
  discussed for when volume grows — not yet implemented)

## Setting up the database

1. In Supabase → SQL Editor, paste and run `supabase/schema.sql` once.
   This creates all tables, triggers, and RLS policies — no real data.
2. Separately, paste and run the file that was sent to you directly in
   chat (**not** in this repo — see `supabase/private/PRIVATE_DATA_README.md`)
   to import the real 16-member roster and PHF/Major Donor data.
3. Promote yourself to admin: in SQL Editor, run
   `update public.members set is_admin = true where email = 'your@email.com';`

## Local development

```
npm install
npm run dev
```

## Deploying

Push to `main` and the GitHub Actions workflow builds and deploys to
GitHub Pages automatically. Point rciu.org's DNS at GitHub Pages
(instructions: https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)
and GitHub Pages settings → confirm the custom domain once DNS
propagates.
