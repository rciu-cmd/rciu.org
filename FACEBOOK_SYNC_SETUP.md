# Facebook auto-sync setup

This makes your RCIU Facebook Page's posts show up on the News page automatically —
no more pasting links into Admin → News. A scheduled job (`.github/workflows/sync-facebook-news.yml`)
checks your Page every 6 hours and publishes any new posts.

It needs four secrets added to GitHub once. Do this in your browser, on GitHub.com —
no code changes needed.

## 1. Get your Facebook Page ID

1. Go to your RCIU Facebook Page.
2. Click **About** → scroll down to **Page transparency** (or just go to
   `https://www.facebook.com/YourPageName/about_profile_transparency`).
3. Note the numeric **Page ID** shown there (looks like `100064123456789`).

This is `FB_PAGE_ID`.

## 2. Get a Page Access Token

1. Go to [Facebook's Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. If you don't have a Facebook Developer account yet, it'll prompt you to create one
   (free, just uses your existing Facebook login).
3. Create a new App if asked (any name, type "Business").
4. In the Explorer, top right, switch from "User Token" to **Page Access Token**, and pick
   your RCIU Page from the dropdown. You may need to grant `pages_read_engagement` and
   `pages_show_list` permissions when prompted.
5. Copy the token it generates. **This short token expires in about an hour** — that's fine,
   the next step converts it to a long-lived one.

### Convert it to a long-lived token (lasts ~60 days)

Facebook doesn't offer a truly permanent Page token without setting up a Business Manager
System User (more setup). The 60-day version is much simpler and fine for a club site —
just means re-running this step every couple of months, or I can build the System User
version later if you'd rather not think about it periodically.

1. Still in Graph API Explorer, click the **(i)** info icon next to your generated token,
   or use the [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
   to inspect it.
2. Use the "Extend Access Token" tool, or call:
   `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id={your-app-id}&client_secret={your-app-secret}&fb_exchange_token={short-lived-token}`
   (App ID and App Secret are on your app's dashboard under Settings → Basic.)
3. The response's `access_token` is your long-lived Page token.

This is `FB_PAGE_ACCESS_TOKEN`.

## 3. Get your Supabase service role key

1. Go to your [Supabase project dashboard](https://supabase.com/dashboard) → Settings → API.
2. Under "Project API keys", copy the **`service_role`** key (NOT the `anon`/publishable
   one already used in the site's code — this one has full database access, so it must
   only ever go into a GitHub secret, never into a file in this repo).

This is `SUPABASE_SERVICE_ROLE_KEY`.

## 4. Your Supabase URL

`https://mdfexlubrbvkdtyqvvtc.supabase.co`

This is `SUPABASE_URL`.

## 5. Add all four as GitHub secrets

1. Go to your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret** four times, adding:
   - `FB_PAGE_ID`
   - `FB_PAGE_ACCESS_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

Once all four are set, the sync starts running automatically every 6 hours. To test it
immediately instead of waiting: go to the **Actions** tab → **Sync Facebook News — rciu.org**
→ **Run workflow**.

## What it does (and doesn't do)

- Publishes your latest Facebook posts to the News page automatically, full post
  (photo/video/text) embedded, exactly like a manually-pasted link would show.
- Never creates duplicates — each post is only ever synced once.
- Does **not** delete a News post if you later delete the original Facebook post.
- Does **not** let you edit the synced post's text from Admin — it's still a live
  Facebook embed, so edits happen on Facebook itself and show up there automatically.
- You can still add manually-written News posts any time from Admin → News — the two
  don't conflict.
