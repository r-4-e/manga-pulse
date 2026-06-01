import { supabase } from "@/integrations/supabase/client";

export interface TierItem {
  id: string;
  title: string;
  cover_url?: string | null;
}
export type TierItems = Record<string, TierItem[]>;

export interface TierListRow {
  id: string;
  user_id: string;
  title: string;
  category: string;
  items: TierItems;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveInput {
  id?: string;
  title: string;
  category?: string;
  items: TierItems;
  is_public?: boolean;
}

/** Insert or update a tier list. RLS enforces user ownership. */
export async function saveTierList(input: SaveInput): Promise<TierListRow> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to save a tier list");
  if (input.id) {
    const { data, error } = await supabase
      .from("tier_lists")
      .update({
        title: input.title,
        category: input.category ?? "overall",
        items: input.items as any,
        is_public: input.is_public ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("user_id", auth.user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as TierListRow;
  }
  const { data, error } = await supabase
    .from("tier_lists")
    .insert({
      user_id: auth.user.id,
      title: input.title,
      category: input.category ?? "overall",
      items: input.items as any,
      is_public: input.is_public ?? true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as TierListRow;
}

export async function getTierList(
  id: string,
): Promise<(TierListRow & { author: { username: string; display_name: string | null; avatar_url: string | null } | null }) | null> {
  const { data: list, error } = await supabase
    .from("tier_lists")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !list) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", list.user_id)
    .maybeSingle();
  return { ...(list as unknown as TierListRow), author: profile ?? null };
}

export async function listUserTierLists(username: string): Promise<TierListRow[]> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return [];
  const { data } = await supabase
    .from("tier_lists")
    .select("*")
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  return (data as unknown as TierListRow[]) ?? [];
}

export async function listMyTierLists(): Promise<TierListRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase
    .from("tier_lists")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false });
  return (data as unknown as TierListRow[]) ?? [];
}

export async function getProfile(username: string) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  return data;
}
