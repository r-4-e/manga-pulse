import { createFileRoute } from "@tanstack/react-router";

// MangaDex serves pre-resized thumbnails at these sizes only.
const ALLOWED_SIZES = new Set(["256", "512"]);

export const Route = createFileRoute("/api/cover")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const file = url.searchParams.get("file");
        const reqSize = url.searchParams.get("size") ?? "256";
        const size = ALLOWED_SIZES.has(reqSize) ? reqSize : "256";

        if (
          !id ||
          !file ||
          !/^[a-z0-9-]+$/i.test(id) ||
          !/^[a-z0-9.-]+$/i.test(file)
        ) {
          return new Response("bad request", { status: 400 });
        }

        const target = `https://uploads.mangadex.org/covers/${id}/${file}.${size}.jpg`;
        try {
          const upstream = await fetch(target, {
            headers: {
              "user-agent": "MangHaven/1.0 (+https://manghaven.app)",
              accept: "image/avif,image/webp,image/*,*/*;q=0.8",
            },
            // Cache at the edge for fast mobile loads.
            cf: { cacheTtl: 60 * 60 * 24 * 30, cacheEverything: true },
          } as RequestInit);

          if (!upstream.ok) {
            return new Response("not found", { status: upstream.status });
          }

          const buf = await upstream.arrayBuffer();
          return new Response(buf, {
            status: 200,
            headers: {
              "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
              // Long browser + CDN cache. Covers are content-addressed so they never change.
              "cache-control": "public, max-age=2592000, s-maxage=2592000, immutable",
              "access-control-allow-origin": "*",
              "x-cover-size": size,
            },
          });
        } catch {
          return new Response("upstream error", { status: 502 });
        }
      },
    },
  },
});
