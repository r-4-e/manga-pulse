import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listOpinions, createOpinion } from "@/lib/opinions";
import { OpinionCard } from "@/components/OpinionCard";
import { useAuth } from "@/lib/auth-context";
import { Flame, Swords, Sparkles, Send, EyeOff } from "lucide-react";
import { z } from "zod";

const SearchSchema = z.object({
  manga: z.string().optional(),
  title: z.string().optional(),
  sort: z.enum(["hot", "new", "controversial"]).optional(),
});

export const Route = createFileRoute("/opinions")({
  validateSearch: SearchSchema,
  component: Opinions,
});

function Opinions() {
  const { sort = "hot", manga, title: mangaTitle } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["opinions", sort],
    queryFn: () => listOpinions(sort),
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user) {
      toast.error("Sign in to post");
      navigate({ to: "/auth" });
      return;
    }
    if (title.trim().length < 3) {
      toast.error("Make it spicier (min 3 chars)");
      return;
    }
    setBusy(true);
    try {
      await createOpinion({
        title: title.trim(),
        body: body.trim() || undefined,
        manga_id: manga,
        manga_title: mangaTitle,
        is_anonymous: anon,
      });
      setTitle("");
      setBody("");
      toast.success("Take dropped 🔥");
      await qc.invalidateQueries({ queryKey: ["opinions"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs">
          <Swords className="h-3 w-3 text-primary" /> Opinion arena
        </div>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Drop a <span className="text-gradient">hot take</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">Real users. Real votes. No bots.</p>
      </header>

      <section className="mb-6 rounded-2xl glass p-4">
        {mangaTitle && (
          <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
            <Sparkles className="h-3 w-3" /> {mangaTitle}
          </div>
        )}
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder={'e.g. "Marineford is overrated"'} className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={2} placeholder="Defend your take (optional)" className="mt-2 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => setAnon(!anon)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${anon ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-muted-foreground"}`}>
            <EyeOff className="h-3 w-3" /> {anon ? "Anonymous" : "Public"}
          </button>
          <button onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gradient-primary)] px-4 py-1.5 text-sm font-semibold text-background glow-magenta disabled:opacity-50">
            <Send className="h-3.5 w-3.5" /> Post
          </button>
        </div>
      </section>

      <div className="mb-4 flex gap-1 rounded-full glass p-1">
        {(["hot", "new", "controversial"] as const).map((s) => (
          <button key={s} onClick={() => navigate({ to: "/opinions", search: { manga, title: mangaTitle, sort: s } })} className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${sort === s ? "bg-[var(--gradient-primary)] text-background" : "text-muted-foreground"}`}>
            {s === "hot" && <Flame className="mr-1 inline h-3 w-3" />} {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/30" />
        ))}
        {(data ?? []).map((o) => (<OpinionCard key={o.id} opinion={o} />))}
        {!isLoading && !data?.length && (
          <p className="py-12 text-center text-muted-foreground">No takes yet. Be the first 🔥</p>
        )}
      </div>
    </main>
  );
}
