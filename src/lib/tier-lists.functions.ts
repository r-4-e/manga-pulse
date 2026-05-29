import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TierItem = z.object({
  id: z.string(),
  title: z.string(),
  cover_url: z.string().nullable().optional(),
});
const TierItems = z.record(z.string(), z.array(TierItem));

export const saveTierList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(1).max(120),
      category: z.string().min(1).max(40).default("overall"),
      items: TierItems,
      is_public: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { data: row, error } = await supabase
        .from("tier_lists")
        .update({ title: data.title, category: data.category, items: data.items, is_public: data.is_public, updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase
      .from("tier_lists")
      .insert({ user_id: userId, title: data.title, category: data.category, items: data.items, is_public: data.is_public })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getTierList = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("tier_lists")
      .select("*, profiles(username, display_name, avatar_url)")
      .eq("id", data.id)
      .maybeSingle();
    return row;
  });

export const listUserTierLists = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ username: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", data.username)
      .maybeSingle();
    if (!profile) return [];
    const { data: lists } = await supabaseAdmin
      .from("tier_lists")
      .select("*")
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false });
    return lists ?? [];
  });

export const getProfile = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ username: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("username", data.username)
      .maybeSingle();
    return profile;
  });
