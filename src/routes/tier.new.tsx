import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { Search, Loader2, Save } from "lucide-react";
import { searchManga, getManga } from "@/lib/manga.functions";
import { saveTierList } from "@/lib/tier-lists.functions";
import { TierBoard, type TierItem, type TierItems } from "@/components/TierBoard";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/tier/new")({
  validateSearch: z.object({ add: z.string().optional() }).parse,
  head: () => ({ meta: [{ title: "New tier list — Mangaverse" }] }),
  component: NewTier,
});

const EMPTY: TierItems = { S: [], A: [], B: [], C: [], D: [], F: [] };

function NewTier() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { add } = Route.useSearch();
  const search = useServerFn(searchManga);
  const fetchOne = useServerFn(getManga);
  const save = useServerFn(saveTierList);

  const [title, setTitle] = useState("My manga tier list");
  const [items, setItems] = useState<TierItems>(EMPTY);
  const [pool, setPool] = useState<TierItem[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  // Auto-add manga from query param
  useQuery({
    queryKey: ["preload", add],
    queryFn: async () => {
      if (!add) return null;
      if ([...pool, ...Object.values(items).flat()].some((i) => i.id === add)) return null;
      const m = await fetchOne({ data: { id: add } });
      if (m) setPool((p) => [...p, { id: m.id, title: m.title, cover_url: m.cover_url }]);
      return m;
    },
    enabled: !!add,
  });

  const searchQ = useQuery({
    queryKey: ["tier-search", q],
    queryFn: () => search({ data: { q } }),
    enabled: q.trim().length >= 2,
  });

  function addToPool(m: { id: string; title: string; cover_url: string | null }) {
    if ([...pool, ...Object.values(items).flat()].some((i) => i.id === m.id)) return;
    setPool((p) => [...p, m]);
    setQ("");
  }

  async function handleSave() {
    if (!user) {
      toast.error("Sign in to save");
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      const row = await save({
        data: { title, category: "overall", items, is_public: true },
      });
      toast.success("Saved 🔥");
      navigate({ to: "/tier/$id", params: { id: row.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-transparent font-display text-2xl font-bold outline-none sm:text-3xl"
        />
        <button
          onClick={handleSave}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gradient-primary)] px-4 py-2 text-sm font-semibold text-background glow-magenta disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="mb-4 rounded-xl glass p-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search manga to add..."
            className="w-full bg-transparent text-sm outline-none"
          />
          {searchQ.isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
        {q.trim().length >= 2 && searchQ.data && searchQ.data.length > 0 && (
          <div className="mt-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-6">
            {searchQ.data.slice(0, 12).map((m) => (
              <button
                key={m.id}
                onClick={() => addToPool({ id: m.id, title: m.title, cover_url: m.cover_url })}
                className="overflow-hidden rounded-lg border border-white/10 transition-all hover:border-primary"
                title={m.title}
              >
                {m.cover_url ? (
                  <img src={m.cover_url} alt={m.title} className="aspect-[2/3] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[2/3] place-items-center bg-muted p-1 text-[9px]">{m.title.slice(0, 20)}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <TierBoard
        initial={items}
        pool={pool}
        onChange={(it, p) => {
          setItems(it);
          setPool(p);
        }}
      />
    </main>
  );
}
