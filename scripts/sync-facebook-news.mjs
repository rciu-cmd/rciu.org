// Pulls the RCIU Facebook Page's latest posts via the Graph API and
// auto-publishes each one as a News item, so nobody has to paste
// Facebook links into Admin -> News by hand anymore.
//
// Runs on a schedule via .github/workflows/sync-facebook-news.yml.
// Requires four secrets set in the GitHub repo (Settings -> Secrets
// and variables -> Actions) — see FACEBOOK_SYNC_SETUP.md for how to
// get each one:
//   FB_PAGE_ID              the numeric Page ID (not the page's @handle)
//   FB_PAGE_ACCESS_TOKEN    a long-lived Page Access Token
//   SUPABASE_URL            e.g. https://xxxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   the "service_role" key (NOT the public
//                            key already used in the site's own code —
//                            this one bypasses Row Level Security, so
//                            it must only ever live in a GitHub secret,
//                            never committed to the repo)
//
// Dedup: `news.facebook_url` has a UNIQUE constraint (migration12), so
// re-running this against posts already synced is a no-op — Supabase
// is told to ignore the conflict rather than error or duplicate.

const { FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

const FB_API_VERSION = "v21.0";

function requireEnv() {
  const missing = ["FB_PAGE_ID", "FB_PAGE_ACCESS_TOKEN", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
    (k) => !process.env[k]
  );
  if (missing.length > 0) {
    console.error(`Missing required secret(s): ${missing.join(", ")}. See FACEBOOK_SYNC_SETUP.md.`);
    process.exit(1);
  }
}

async function fetchFacebookPosts() {
  const url =
    `https://graph.facebook.com/${FB_API_VERSION}/${FB_PAGE_ID}/posts` +
    `?fields=id,message,full_picture,permalink_url,created_time&limit=10&access_token=${FB_PAGE_ACCESS_TOKEN}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) {
    console.error("Facebook Graph API error:", json.error);
    process.exit(1);
  }
  return (json.data || []).filter((p) => p.permalink_url);
}

async function upsertNewsRow(post) {
  const row = {
    facebook_url: post.permalink_url,
    cover_image_url: post.full_picture || null,
    status: "published",
    published_at: post.created_time,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/news?on_conflict=facebook_url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      // ignore-duplicates: a post already synced is silently skipped
      // rather than erroring or creating a second row.
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to sync ${post.permalink_url}: ${res.status} ${text}`);
    return false;
  }
  return true;
}

async function main() {
  requireEnv();
  const posts = await fetchFacebookPosts();
  console.log(`Fetched ${posts.length} post(s) from the Facebook Page.`);

  let synced = 0;
  for (const post of posts) {
    const ok = await upsertNewsRow(post);
    if (ok) synced++;
  }
  console.log(`Done — ${synced}/${posts.length} post(s) processed (already-synced posts are skipped silently).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
