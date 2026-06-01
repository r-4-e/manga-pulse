import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Search, Loader2, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchManga, getManga, type MangaSummary } from "@/lib/manga";
import { saveTierList } from "@/lib/tier-lists";
import { TierBoard, type TierItem, type TierItems } from "@/components/TierBoard";
import { CoverImg } from "@/components/CoverImg";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/tier/new")({
  validateSearch: z.object({ add: z.string().optional() }).parse,
  component: NewTier,
});

const TIERS = ["S", "A", "B", "C", "D", "F"] as const;
const EMPTY: TierItems = { S: [], A: [], B: [], C: [], D: [], F: [] };

function NewTier() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { add } = Route.useSearch();

  const [title, setTitle] = useState("My manga tier list");
  const [items, setItems] = useState<TierItems>(EMPTY);
  const [pool, setPool] = useState<TierItem[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  // Preload from ?add=
  useQuery({
    queryKey: ["preload", add],
    queryFn: async () => {
      if (!add) return null;
      if ([...pool, ...Object.values(items).flat()].some((i) => i.id === add)) return null;
      const m = await getManga(add);
      if (m) setPool((p) => [...p, { id: m.id, title: m.title, cover_url: m.cover_url }]);
      return m;
    },
    enabled: !!add,
  });

  const searchQ = useQuery({
    queryKey: ["tier-search", q],
    queryFn: () => searchManga(q),
    enabled: q.trim().length >= 2,
  });

  function hasId(id: string) {
    return [...pool, ...Object.values(items).flat()].some((i) => i.id === id);
  }

  function addToTier(m: MangaSummary, tier: string | "POOL") {
    if (hasId(m.id)) {
      toast.info("Already added");
      return;
    }
    const it: TierItem = { id: m.id, title: m.title, cover_url: m.cover_url };
    if (tier === "POOL") {
      setPool((p) => [...p, it]);
    } else {
      setItems((prev) => ({ ...prev, [tier]: [...(prev[tier] ?? []), it] }));
    }
    toast.success(tier === "POOL" ? "Added to pool" : `Added to ${tier}`);
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
      const row = await saveTierList({
        title,
        category: "overall",
        items,
        is_public: true,
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

        {q.trim().length >= 2 && (
          <div className="mt-3 space-y-2">
            {searchQ.isError && (
              <p className="py-4 text-center text-sm text-destructive">
                Search failed. Try again.
              </p>
            )}
            {!searchQ.isFetching && searchQ.data?.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No results for "{q}"
              </p>
            )}
            {searchQ.data?.slice(0, 12).map((m) => (
              <SearchResult key={m.id} m={m} onPick={(tier) => addToTier(m, tier)} />
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

/**
 * Mobile-friendly search result row with one-tap "add to tier" buttons.
 */
function SearchResult({
  m,
  onPick,
}: {
  m: MangaSummary;
  onPick: (tier: string | "POOL") => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-2">
      <div className="h-14 w-10 shrink-0 overflow-hidden rounded">
        <CoverImg src={m.cover_url} alt={m.title} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{m.title}</p>
        {m.author && <p className="truncate text-xs text-muted-foreground">{m.author}</p>}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => onPick(t)}
              className="grid h-7 w-7 place-items-center rounded-md font-display text-xs font-black text-background"
              style={{ background: `var(--tier-${t.toLowerCase()})` }}
              aria-label={`Add to ${t}`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => onPick("POOL")}
            className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Pool
          </button>
        </div>
      </div>
    </div>
  );
}
