import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VoteKind = z.enum([
  "agree", "strong_agree", "disagree", "strong_disagree",
  "well_explained", "poor_argument", "unique", "common", "controversial",
]);

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

function summarize(opinion: any, votes: any[]): OpinionWithStats {
  const counts: Record<string, number> = {};
  for (const v of votes) counts[v.kind] = (counts[v.kind] ?? 0) + 1;
  const agree = (counts.agree ?? 0) + (counts.strong_agree ?? 0) * 2;
  const disagree = (counts.disagree ?? 0) + (counts.strong_disagree ?? 0) * 2;
  const total = agree + disagree;
  const agreement_pct = total ? Math.round((agree / total) * 100) : 0;
  const controversy = total
    ? Math.round(100 * (1 - Math.abs(agreement_pct - 50) / 50))
    : 0;
  const score =
    agree + disagree +
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
    author: opinion.is_anonymous ? null : opinion.profiles ?? null,
    votes: counts,
    score: Math.round(score),
    agreement_pct,
    controversy,
  };
}

export const listOpinions = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ sort: z.enum(["new", "hot", "controversial"]).default("hot") }).parse(d ?? {}))
  .handler(async ({ data }): Promise<OpinionWithStats[]> => {
    const { data: opinions, error } = await supabaseAdmin
      .from("opinions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const ids = (opinions ?? []).map((o: any) => o.id);
    const userIds = Array.from(new Set((opinions ?? []).map((o: any) => o.user_id).filter(Boolean)));
    const [votesRes, profilesRes] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("opinion_votes").select("opinion_id, kind").in("opinion_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      userIds.length
        ? supabaseAdmin.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const votes = votesRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const profileById = new Map<string, any>();
    for (const p of profiles) profileById.set(p.id, { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url });
    const byOpinion = new Map<string, any[]>();
    for (const v of votes) {
      const list = byOpinion.get(v.opinion_id) ?? [];
      list.push(v);
      byOpinion.set(v.opinion_id, list);
    }
    let result = (opinions ?? []).map((o: any) =>
      summarize({ ...o, profiles: profileById.get(o.user_id) ?? null }, byOpinion.get(o.id) ?? []),
    );
    if (data.sort === "hot") result.sort((a, b) => b.score - a.score);
    if (data.sort === "controversial") result.sort((a, b) => b.controversy - a.controversy);
    return result;
  });

export const createOpinion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      title: z.string().trim().min(3).max(140),
      body: z.string().trim().max(2000).optional(),
      manga_id: z.string().optional(),
      manga_title: z.string().optional(),
      is_anonymous: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("opinions")
      .insert({
        user_id: userId,
        title: data.title,
        body: data.body ?? null,
        manga_id: data.manga_id ?? null,
        manga_title: data.manga_title ?? null,
        is_anonymous: data.is_anonymous,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const voteOpinion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ opinion_id: z.string().uuid(), kind: VoteKind }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Toggle: if exists -> delete, else insert
    const { data: existing } = await supabase
      .from("opinion_votes")
      .select("id")
      .eq("opinion_id", data.opinion_id)
      .eq("user_id", userId)
      .eq("kind", data.kind)
      .maybeSingle();
    if (existing) {
      await supabase.from("opinion_votes").delete().eq("id", existing.id);
      return { toggled: "off" as const };
    }
    const { error } = await supabase
      .from("opinion_votes")
      .insert({ opinion_id: data.opinion_id, user_id: userId, kind: data.kind });
    if (error) throw new Error(error.message);
    return { toggled: "on" as const };
  });
