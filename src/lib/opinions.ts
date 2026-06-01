import { supabase } from "@/integrations/supabase/client";

export type VoteKind =
  | "agree"
  | "strong_agree"
  | "disagree"
  | "strong_disagree"
  | "well_explained"
  | "poor_argument"
  | "unique"
  | "common"
  | "controversial";

export interface OpinionWithStats {
  id: string;
  user_id: string;
  manga_id: string | null;
  manga_title: string | null;
  title: string;
  body: string | null;
  is_anonymous: boolean;
  created_at: string;
  author: { username: string; display_name: string | null; avatar_url: string | null } | null;
  votes: Record<string, number>;
  score: number;
  agreement_pct: number;
  controversy: number;
}

function summarize(opinion: any, votes: any[], author: any): OpinionWithStats {
  const counts: Record<string, number> = {};
  for (const v of votes) counts[v.kind] = (counts[v.kind] ?? 0) + 1;
  const agree = (counts.agree ?? 0) + (counts.strong_agree ?? 0) * 2;
  const disagree = (counts.disagree ?? 0) + (counts.strong_disagree ?? 0) * 2;
  const total = agree + disagree;
  const agreement_pct = total ? Math.round((agree / total) * 100) : 0;
  const controversy = total ? Math.round(100 * (1 - Math.abs(agreement_pct - 50) / 50)) : 0;
  const score =
    agree +
    disagree +
    (counts.well_explained ?? 0) * 2 +
    (counts.unique ?? 0) * 2 +
    (counts.controversial ?? 0) * 1.5 -
    (counts.poor_argument ?? 0);
  return {
    id: opinion.id,
    user_id: opinion.user_id,
    manga_id: opinion.manga_id,
    manga_title: opinion.manga_title,
    title: opinion.title,
    body: opinion.body,
    is_anonymous: opinion.is_anonymous,
    created_at: opinion.created_at,
    author: opinion.is_anonymous ? null : author ?? null,
    votes: counts,
    score: Math.round(score),
    agreement_pct,
    controversy,
  };
}

export async function listOpinions(
  sort: "hot" | "new" | "controversial" = "hot",
): Promise<OpinionWithStats[]> {
  const { data: opinions, error } = await supabase
    .from("opinions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);

  const ids = (opinions ?? []).map((o: any) => o.id);
  const userIds = Array.from(new Set((opinions ?? []).map((o: any) => o.user_id).filter(Boolean)));

  const [votesRes, profilesRes] = await Promise.all([
    ids.length
      ? supabase.from("opinion_votes").select("opinion_id, kind").in("opinion_id", ids)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length
      ? supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const votes = votesRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const profileById = new Map<string, any>();
  for (const p of profiles) profileById.set(p.id, p);
  const byOpinion = new Map<string, any[]>();
  for (const v of votes) {
    const list = byOpinion.get(v.opinion_id) ?? [];
    list.push(v);
    byOpinion.set(v.opinion_id, list);
  }

  let result = (opinions ?? []).map((o: any) =>
    summarize(o, byOpinion.get(o.id) ?? [], profileById.get(o.user_id)),
  );
  if (sort === "hot") result.sort((a, b) => b.score - a.score);
  if (sort === "controversial") result.sort((a, b) => b.controversy - a.controversy);
  return result;
}

export interface CreateOpinionInput {
  title: string;
  body?: string;
  manga_id?: string;
  manga_title?: string;
  is_anonymous?: boolean;
}

export async function createOpinion(input: CreateOpinionInput) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to post");
  const t = input.title.trim();
  if (t.length < 3 || t.length > 140) throw new Error("Title must be 3–140 characters");
  const { data, error } = await supabase
    .from("opinions")
    .insert({
      user_id: auth.user.id,
      title: t,
      body: input.body?.trim() || null,
      manga_id: input.manga_id ?? null,
      manga_title: input.manga_title ?? null,
      is_anonymous: input.is_anonymous ?? false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Toggle a vote. Returns "on" if newly added, "off" if removed. */
export async function voteOpinion(
  opinion_id: string,
  kind: VoteKind,
): Promise<"on" | "off"> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to vote");
  const { data: existing } = await supabase
    .from("opinion_votes")
    .select("id")
    .eq("opinion_id", opinion_id)
    .eq("user_id", auth.user.id)
    .eq("kind", kind)
    .maybeSingle();
  if (existing) {
    await supabase.from("opinion_votes").delete().eq("id", existing.id);
    return "off";
  }
  const { error } = await supabase
    .from("opinion_votes")
    .insert({ opinion_id, user_id: auth.user.id, kind });
  if (error) throw new Error(error.message);
  return "on";
}
