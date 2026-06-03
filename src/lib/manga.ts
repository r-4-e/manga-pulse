// Browser-side manga client backed by AniList's public GraphQL API.
// AniList returns `Access-Control-Allow-Origin: *`, so it works from any
// origin — lovable.dev previews, Netlify, and custom domains — without a
// server proxy. (MangaDex doesn't send CORS headers for arbitrary origins,
// which is why the previous direct-fetch implementation failed in previews.)
import { supabase } from "@/integrations/supabase/client";

const ANILIST = "https://graphql.anilist.co";

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

interface AniListMedia {
  id: number;
  title?: { english?: string | null; romaji?: string | null; native?: string | null };
  coverImage?: { large?: string | null; extraLarge?: string | null };
  description?: string | null;
  status?: string | null;
  startDate?: { year?: number | null };
  genres?: string[] | null;
  averageScore?: number | null;
  staff?: { edges?: Array<{ role?: string; node?: { name?: { full?: string } } }> };
}

const MEDIA_FIELDS = `
  id
  title { english romaji native }
  coverImage { large extraLarge }
  description(asHtml: false)
  status
  startDate { year }
  genres
  averageScore
  staff(perPage: 4) {
    edges { role node { name { full } } }
  }
`;

function stripHtml(s: string | null | undefined): string | null {
  if (!s) return null;
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function normalize(m: AniListMedia): MangaSummary {
  const title = m.title?.english || m.title?.romaji || m.title?.native || "Untitled";
  const author =
    m.staff?.edges?.find((e) => /story|art|original/i.test(e.role ?? ""))?.node?.name?.full ??
    m.staff?.edges?.[0]?.node?.name?.full ??
    null;
  return {
    id: String(m.id),
    title,
    cover_url: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
    author,
    status: m.status?.toLowerCase().replace(/_/g, " ") ?? null,
    year: m.startDate?.year ?? null,
    genres: m.genres ?? [],
    description: stripHtml(m.description),
    rating: typeof m.averageScore === "number" ? m.averageScore / 10 : null,
  };
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? "AniList error");
  return json.data as T;
}

// Fire-and-forget cache write. RLS forbids anon writes — fail silently if not signed in.
async function cacheManga(items: MangaSummary[]) {
  if (!items.length) return;
  try {
    await supabase.from("manga_cache").upsert(
      items.map((m) => ({
        id: m.id,
        source: "anilist",
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
    // best-effort
  }
}

export async function searchManga(q: string): Promise<MangaSummary[]> {
  if (!q.trim()) return [];
  const query = `
    query ($q: String, $perPage: Int) {
      Page(perPage: $perPage) {
        media(search: $q, type: MANGA, sort: SEARCH_MATCH, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await gql<{ Page: { media: AniListMedia[] } }>(query, {
    q: q.trim(),
    perPage: 24,
  });
  const items = (data.Page?.media ?? []).map(normalize);
  cacheManga(items);
  return items;
}

export async function getPopularManga(): Promise<MangaSummary[]> {
  const query = `
    query ($perPage: Int) {
      Page(perPage: $perPage) {
        media(type: MANGA, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  try {
    const data = await gql<{ Page: { media: AniListMedia[] } }>(query, { perPage: 18 });
    const items = (data.Page?.media ?? []).map(normalize);
    cacheManga(items);
    return items;
  } catch {
    return [];
  }
}

export async function getFeaturedManga(): Promise<MangaSummary[]> {
  // Alias to popular — keeps the existing call sites working.
  return getPopularManga();
}

export async function getManga(id: string): Promise<MangaSummary | null> {
  // Try cache first.
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

  const numeric = Number(id);
  if (!Number.isFinite(numeric) || numeric <= 0) {
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
          rating: cached.rating ? Number(cached.rating) : null,
        }
      : null;
  }

  const query = `
    query ($id: Int) {
      Media(id: $id, type: MANGA) {
        ${MEDIA_FIELDS}
      }
    }
  `;
  try {
    const data = await gql<{ Media: AniListMedia | null }>(query, { id: numeric });
    if (!data.Media) return null;
    const item = normalize(data.Media);
    cacheManga([item]);
    return item;
  } catch {
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
          rating: cached.rating ? Number(cached.rating) : null,
        }
      : null;
  }
}
