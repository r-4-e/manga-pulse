import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Auto-generated social share card for tier lists.
 * Returns an SVG image — supported by Discord, Slack, Telegram, LinkedIn, iMessage.
 */
export const Route = createFileRoute("/api/og/tier/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!/^[a-f0-9-]{36}$/i.test(id)) {
          return new Response("bad id", { status: 400 });
        }

        const { data: list } = await supabaseAdmin
          .from("tier_lists")
          .select("title, items, profiles(username, display_name)")
          .eq("id", id)
          .maybeSingle();

        const title = (list?.title ?? "Tier list").slice(0, 60);
        const author =
          (list as any)?.profiles?.username ??
          (list as any)?.profiles?.display_name ??
          "MangHaven";

        // Top 6 covers from the S/A tiers for the card preview.
        const items = ((list?.items ?? {}) as Record<
          string,
          { id: string; title: string; cover_url?: string }[]
        >);
        const picks = [
          ...(items.S ?? []),
          ...(items.A ?? []),
          ...(items.B ?? []),
        ].slice(0, 6);

        const W = 1200;
        const H = 630;
        const tileW = 150;
        const tileH = 225;
        const gap = 16;
        const totalW = picks.length * tileW + (picks.length - 1) * gap;
        const startX = (W - totalW) / 2;
        const tileY = 280;

        const tiles = picks
          .map((p, i) => {
            const x = startX + i * (tileW + gap);
            const safeTitle = escapeXml(p.title.slice(0, 18));
            return p.cover_url
              ? `<image href="${escapeXml(absoluteCover(p.cover_url))}" x="${x}" y="${tileY}" width="${tileW}" height="${tileH}" preserveAspectRatio="xMidYMid slice" />`
              : `<rect x="${x}" y="${tileY}" width="${tileW}" height="${tileH}" rx="10" fill="#222"/><text x="${x + tileW / 2}" y="${tileY + tileH / 2}" fill="#888" font-size="14" text-anchor="middle" font-family="Inter,sans-serif">${safeTitle}</text>`;
          })
          .join("");

        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0a0a"/>
      <stop offset="1" stop-color="#1a1a1a"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <g transform="translate(60,60)">
    <rect width="56" height="56" rx="12" fill="#ffffff"/>
    <text x="20" y="28" font-family="Inter,sans-serif" font-weight="800" font-size="22" fill="#0a0a0a">M</text>
    <text x="36" y="46" font-family="Inter,sans-serif" font-weight="800" font-size="22" fill="#0a0a0a">H</text>
    <text x="74" y="38" font-family="Inter,sans-serif" font-weight="700" font-size="26" fill="#ffffff">MangHaven</text>
  </g>

  <text x="60" y="200" font-family="Inter,sans-serif" font-weight="800" font-size="56" fill="#ffffff">${escapeXml(title)}</text>
  <text x="60" y="248" font-family="Inter,sans-serif" font-weight="500" font-size="22" fill="#a0a0a0">Tier list by @${escapeXml(author)}</text>

  ${tiles}

  <text x="60" y="580" font-family="Inter,sans-serif" font-weight="500" font-size="20" fill="#888">manghaven · rank · debate · share</text>
</svg>`;

        return new Response(svg, {
          status: 200,
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=300, s-maxage=3600",
          },
        });
      },
    },
  },
});

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteCover(url: string): string {
  if (url.startsWith("http")) return url;
  // /api/cover?... — needs to be turned into upstream MangaDex URL for SVG <image>.
  try {
    const u = new URL(url, "http://x");
    const id = u.searchParams.get("id");
    const file = u.searchParams.get("file");
    const size = u.searchParams.get("size") ?? "256";
    if (id && file) {
      return `https://uploads.mangadex.org/covers/${id}/${file}.${size}.jpg`;
    }
  } catch {}
  return url;
}
