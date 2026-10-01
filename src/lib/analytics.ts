// Cloudflare Web Analytics — visitor counts, top pages, countries,
// referrers. Privacy-friendly: no cookies, no personal data, so no
// cookie banner is needed.
//
// rciu.org's DNS records are "DNS only" (grey cloud), so traffic goes
// straight to GitHub Pages and Cloudflare can't count it on its own —
// the site loads Cloudflare's small beacon script instead
// (src/app/layout.tsx). The token is public (it ends up in every page),
// it just tells Cloudflare which site the visit belongs to.
//
// Where it comes from: Cloudflare dashboard → Analytics & Logs → Web
// Analytics → Add a site → rciu.org → the "token" value inside the
// JavaScript snippet it shows. Empty = the script isn't added at all.
export const CLOUDFLARE_WEB_ANALYTICS_TOKEN = "";
