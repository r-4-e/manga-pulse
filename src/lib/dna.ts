// Manga DNA + recommendations. Pure client logic.
import { supabase } from "@/integrations/supabase/client";
import type { TierItems } from "./tier-lists";
import type { MangaSummary } from "./manga";

// Map onboarding genre tags → likely MangaDex genre names.
const ONBOARDING_GENRE_MAP: Record<string, string[]> = {
  shonen: ["Action", "Adventure", "Shounen"],
  seinen: ["Seinen", "Drama", "Psychological"],
  romance: ["Romance"],
  horror: ["Horror", "Supernatural"],
  slice: ["Slice of Life"],
  isekai: ["Isekai", "Fantasy"],
  sports: ["Sports"],
  psychological: ["Psychological", "Mystery", "Thriller"],
};

const TIER_WEIGHT: Record<string, number> = {
  S: 5,
  A: 3,
  B: 1,
  C: 0,
  D: -2,
  F: -4,
};

const VOTE_WEIGHT: Record<string, number> = {
  strong_agree: 3,
  agree: 1.5,
  well_explained: 1,
  unique: 1,
  controversial: 0.5,
  common: 0,
  disagree: -1.5,
  strong_disagree: -3,
  poor_argument: -1,
};

export interface GenreScore {
  genre: string;
  score: number;
  pct: number; // percentage of total positive
}

export interface DnaReport {
  topGenres: GenreScore[];
  signalCount: number; // how many manga contributed to the score
  hasOnboarding: boolean;
  rankedIds: Set<string>; // manga the user has already placed on tier lists
}

interface MangaCacheRow {
  id: string;
  title: string;
  cover_url: string | null;
  author: string | null;
  genres: string[] | null;
  rating: number | null;
  year: number | null;
  status: string | null;
  description: string | null;
}

export async function computeMyDna(userId: string): Promise<DnaReport> {
  // Pull profile + tier lists + opinion votes in parallel
  const [profileRes, tiersRes, votesRes] = await Promise.all([
    supabase.from("profiles").select("manga_dna").eq("id", userId).maybeSingle(),
    supabase.from("tier_lists").select("items").eq("user_id", userId),
    supabase
      .from("opinion_votes")
      .select("kind, opinions ( manga_id )")
      .eq("user_id", userId),
  ]);

  const dna = (profileRes.data?.manga_dna ?? {}) as Record<string, any>;
  const hasOnboarding = !!dna.completed_at;

  // Collect manga ids encountered + their tier contribution
  const mangaContribution = new Map<string, number>();
  const rankedIds = new Set<string>();

  for (const list of tiersRes.data ?? []) {
    const items = (list.items ?? {}) as TierItems;
    for (const [tier, arr] of Object.entries(items)) {
      const w = TIER_WEIGHT[tier] ?? 0;
      for (const it of arr) {
        rankedIds.add(it.id);
        mangaContribution.set(it.id, (mangaContribution.get(it.id) ?? 0) + w);
      }
    }
  }

  for (const v of votesRes.data ?? []) {
    const op = (v as any).opinions;
    const mid = op?.manga_id;
    if (!mid) continue;
    const w = VOTE_WEIGHT[v.kind] ?? 0;
    mangaContribution.set(mid, (mangaContribution.get(mid) ?? 0) + w * 0.5);
  }

  // Look up genres for all involved manga
  const ids = Array.from(mangaContribution.keys());
  let rows: MangaCacheRow[] = [];
  if (ids.length) {
    const { data } = await supabase.from("manga_cache").select("*").in("id", ids);
    rows = (data as MangaCacheRow[]) ?? [];
  }

  const genreScore = new Map<string, number>();
  let signalCount = 0;
  for (const r of rows) {
    const contrib = mangaContribution.get(r.id) ?? 0;
    if (contrib === 0) continue;
    signalCount++;
    for (const g of r.genres ?? []) {
      genreScore.set(g, (genreScore.get(g) ?? 0) + contrib);
    }
  }

  // Add onboarding boost
  const onboardingGenres: string[] = Array.isArray(dna.genres) ? dna.genres : [];
  for (const og of onboardingGenres) {
    for (const mapped of ONBOARDING_GENRE_MAP[og] ?? []) {
      genreScore.set(mapped, (genreScore.get(mapped) ?? 0) + 4);
    }
  }

  // Top genres by positive score
  const all = Array.from(genreScore.entries())
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const totalPos = all.reduce((acc, [, s]) => acc + s, 0) || 1;
  const topGenres: GenreScore[] = all.map(([genre, score]) => ({
    genre,
    score,
    pct: Math.round((score / totalPos) * 100),
  }));

  return { topGenres, signalCount, hasOnboarding, rankedIds };
}

/**
 * Return manga from the cache that match the user's top genres
 * and haven't already been ranked.
 */
export async function getRecommendations(
  report: DnaReport,
  limit = 18,
): Promise<MangaSummary[]> {
  if (report.topGenres.length === 0) return [];
  const topGenreNames = report.topGenres.slice(0, 4).map((g) => g.genre);

  // We can't filter array-containment cleanly with postgrest from client without RPC,
  // so pull a chunk ordered by rating and filter client-side.
  const { data } = await supabase
    .from("manga_cache")
    .select("*")
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(200);
  const rows = (data as MangaCacheRow[]) ?? [];

  const scored = rows
    .filter((r) => !report.rankedIds.has(r.id))
    .map((r) => {
      const matches = (r.genres ?? []).filter((g) => topGenreNames.includes(g)).length;
      return { row: r, matches };
    })
    .filter((x) => x.matches > 0)
    .sort((a, b) => b.matches - a.matches || (b.row.rating ?? 0) - (a.row.rating ?? 0))
    .slice(0, limit);

  return scored.map(({ row }) => ({
    id: row.id,
    title: row.title,
    cover_url: row.cover_url,
    author: row.author,
    status: row.status,
    year: row.year,
    genres: row.genres ?? [],
    description: row.description,
    rating: row.rating ? Number(row.rating) : null,
  }));
}
