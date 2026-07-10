// Public invite-link handler.
//
// URL shape:  https://<project>.supabase.co/functions/v1/invite/<dealId>
//
// - Social crawlers (Discord, Twitter, Slack, Facebook, Telegram, etc.) get a
//   small HTML document with Open Graph meta tags styled like the "Accept a
//   deal invite — Halal MM" preview.
// - Real users get a 302 redirect to https://halalmiddleman.net/auth?invite=<dealId>

const SITE_ORIGIN = "https://halalmiddleman.net";
const OG_IMAGE = `${SITE_ORIGIN}/logo-og.png`;

const BOT_UA = /bot|crawler|spider|facebookexternalhit|discordbot|slackbot|twitterbot|telegrambot|whatsapp|linkedinbot|embedly|preview|pinterest|skypeuripreview|googlebot|bingbot|duckduckbot|applebot|redditbot|vkshare/i;

function isBot(ua: string | null): boolean {
  if (!ua) return true; // no UA → treat as crawler so we still serve OG tags
  return BOT_UA.test(ua);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(inviteUrl: string): string {
  const title = "Accept a deal invite — Halal MM";
  const description = "Open this link to join a deal on Halal MM.";
  const siteName = "Halal MM";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(siteName)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(inviteUrl)}" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta property="og:image:width" content="96" />
    <meta property="og:image:height" content="96" />

    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${OG_IMAGE}" />

    <meta http-equiv="refresh" content="0; url=${escapeHtml(inviteUrl)}" />
    <link rel="canonical" href="${escapeHtml(inviteUrl)}" />
  </head>
  <body>
    <p>Redirecting to <a href="${escapeHtml(inviteUrl)}">${escapeHtml(siteName)}</a>…</p>
    <script>window.location.replace(${JSON.stringify(inviteUrl)});</script>
  </body>
</html>`;
}

Deno.serve((req) => {
  const url = new URL(req.url);
  // Path is /functions/v1/invite/<dealId>  → grab the last segment.
  const segments = url.pathname.split("/").filter(Boolean);
  const dealId = segments[segments.length - 1] || "";

  // Basic UUID-ish guard so junk hits don't hang the redirect.
  const safeDealId = /^[a-zA-Z0-9-]{1,64}$/.test(dealId) ? dealId : "";
  const inviteUrl = safeDealId
    ? `${SITE_ORIGIN}/auth?invite=${encodeURIComponent(safeDealId)}`
    : `${SITE_ORIGIN}/auth`;

  const ua = req.headers.get("user-agent");

  if (isBot(ua)) {
    return new Response(buildHtml(inviteUrl), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  }

  return Response.redirect(inviteUrl, 302);
});