import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cover")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const file = url.searchParams.get("file");
        const size = url.searchParams.get("size") ?? "256";
        if (!id || !file || !/^[a-z0-9-]+$/i.test(id) || !/^[a-z0-9.-]+$/i.test(file)) {
          return new Response("bad request", { status: 400 });
        }
        const target = `https://uploads.mangadex.org/covers/${id}/${file}.${size}.jpg`;
        const upstream = await fetch(target, {
          headers: {
            "user-agent": "MangHaven/1.0 (+https://manghaven.app)",
            accept: "image/avif,image/webp,image/*,*/*;q=0.8",
          },
        });
        if (!upstream.ok) return new Response("not found", { status: upstream.status });
        const buf = await upstream.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
            "cache-control": "public, max-age=86400, immutable",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
