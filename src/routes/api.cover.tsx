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
        const upstream = await fetch(target, { headers: { Referer: "" } });
        if (!upstream.ok) return new Response("not found", { status: upstream.status });
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
            "cache-control": "public, max-age=86400, immutable",
          },
        });
      },
    },
  },
});
