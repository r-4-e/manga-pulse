// Browser-side MangaDex client. No server functions, no proxy.
// MangaDex API supports CORS and doesn't require auth.
import { supabase } from "@/integrations/supabase/client";

// Use a same-origin proxy in production to avoid MangaDex CORS issues
// (MangaDex doesn't return Access-Control-Allow-Origin for arbitrary origins).
// Netlify `_redirects` rewrites `/api/md/*` → `https://api.mangadex.org/*`
// and `/md-covers/*` → `https://uploads.mangadex.org/covers/*`.
const MD =
  typeof window !== "undefined" && window.location.hostname.endsWith("netlify.app")
    ? "/api/md"
    : "https://api.mangadex.org";
const COVERS =
  typeof window !== "undefined" && window.location.hostname.endsWith("netlify.app")
    ? "/md-covers"
    : "https://uploads.mangadex.org/covers";

export interface MangaSummary {
  id: string;
  title: string;
  cover_url: string | null;
  author: string | null;
  status: string | null;
  year: number | null;
  genres: string[];
  description: string | null;
  rating: number | null;
}

function pickTitle(attrs: any): string {
  const t = attrs?.title ?? {};
  return t.en ?? t["ja-ro"] ?? t.ja ?? Object.values(t)[0] ?? "Untitled";
}

function pickDescription(attrs: any): string | null {
  const d = attrs?.description ?? {};
  return d.en ?? Object.values(d)[0] ?? null;
}

function normalize(item: any): MangaSummary {
  const attrs = item.attributes ?? {};
  const rels = item.relationships ?? [];
  const author = rels.find((r: any) => r.type === "author")?.attributes?.name ?? null;
  const coverRel = rels.find((r: any) => r.type === "cover_art");
  const coverFile = coverRel?.attributes?.fileName ?? null;
  const cover_url = coverFile
    ? `${COVERS}/${item.id}/${coverFile}.256.jpg`
    : null;
  return {
    id: item.id,
    title: pickTitle(attrs),
    cover_url,
    author,
    status: attrs.status ?? null,
    year: attrs.year ?? null,
    genres: (attrs.tags ?? []).map((t: any) => t.attributes?.name?.en).filter(Boolean),
    description: pickDescription(attrs),
    rating: null,
  };
}

// Fire-and-forget cache write. RLS forbids anon writes — fail silently if not signed in.
async function cacheManga(items: MangaSummary[]) {
  if (!items.length) return;
  try {
    await supabase.from("manga_cache").upsert(
      items.map((m) => ({
        id: m.id,
        source: "mangadex",
        title: m.title,
        cover_url: m.cover_url,
        author: m.author,
        status: m.status,
        year: m.year,
        genres: m.genres,
        description: m.description,
        rating: m.rating,
        fetched_at: new Date().toISOString(),
      })),
      { onConflict: "id" },
    );
  } catch {
    // ignore — cache is best-effort
  }
}

export async function searchManga(q: string): Promise<MangaSummary[]> {
  if (!q.trim()) return [];
  const url = new URL(`${MD}/manga`);
  url.searchParams.set("title", q);
  url.searchParams.set("limit", "24");
  url.searchParams.append("includes[]", "cover_art");
  url.searchParams.append("includes[]", "author");
  url.searchParams.append("contentRating[]", "safe");
  url.searchParams.append("contentRating[]", "suggestive");
  url.searchParams.set("order[relevance]", "desc");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`MangaDex search failed (${res.status})`);
  const json = await res.json();
  const items: MangaSummary[] = (json.data ?? []).map(normalize);
  cacheManga(items);
  return items;
}

const FEATURED_TITLES = [
  "Berserk",
  "Vinland Saga",
  "Vagabond",
  "Attack on Titan",
  "One Piece",
  "Chainsaw Man",
  "Jujutsu Kaisen",
  "Monster",
  "Bleach",
  "Naruto",
  "Hunter x Hunter",
  "Tokyo Ghoul",
];

export async function getFeaturedManga(): Promise<MangaSummary[]> {
  const results = await Promise.all(
    FEATURED_TITLES.map(async (title) => {
      try {
        const url = new URL(`${MD}/manga`);
        url.searchParams.set("title", title);
        url.searchParams.set("limit", "1");
        url.searchParams.append("includes[]", "cover_art");
        url.searchParams.append("includes[]", "author");
        url.searchParams.append("contentRating[]", "safe");
        url.searchParams.append("contentRating[]", "suggestive");
        url.searchParams.set("order[relevance]", "desc");
        const res = await fetch(url.toString());
        if (!res.ok) return null;
        const json = await res.json();
        const item = json.data?.[0];
        return item ? normalize(item) : null;
      } catch {
        return null;
      }
    }),
  );
  const items = results.filter((x): x is MangaSummary => !!x);
  cacheManga(items);
  return items;
}

export async function getPopularManga(): Promise<MangaSummary[]> {
  const url = new URL(`${MD}/manga`);
  url.searchParams.set("limit", "18");
  url.searchParams.append("includes[]", "cover_art");
  url.searchParams.append("includes[]", "author");
  url.searchParams.append("contentRating[]", "safe");
  url.searchParams.append("contentRating[]", "suggestive");
  url.searchParams.set("order[followedCount]", "desc");
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const json = await res.json();
  const items: MangaSummary[] = (json.data ?? []).map(normalize);
  cacheManga(items);
  return items;
}

export async function getManga(id: string): Promise<MangaSummary | null> {
  // Try cache first
  const { data: cached } = await supabase
    .from("manga_cache")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (
    cached &&
    Date.now() - new Date(cached.fetched_at).getTime() < 1000 * 60 * 60 * 24
  ) {
    return {
      id: cached.id,
      title: cached.title,
      cover_url: cached.cover_url,
      author: cached.author,
      status: cached.status,
      year: cached.year,
      genres: cached.genres ?? [],
      description: cached.description,
      rating: cached.rating ? Number(cached.rating) : null,
    };
  }
  const url = new URL(`${MD}/manga/${id}`);
  url.searchParams.append("includes[]", "cover_art");
  url.searchParams.append("includes[]", "author");
  const res = await fetch(url.toString());
  if (!res.ok) {
    return cached
      ? {
          id: cached.id,
          title: cached.title,
          cover_url: cached.cover_url,
          author: cached.author,
          status: cached.status,
          year: cached.year,
          genres: cached.genres ?? [],
          description: cached.description,
          rating: null,
        }
      : null;
  }
  const json = await res.json();
  const item = normalize(json.data);
  cacheManga([item]);
  return item;
}
