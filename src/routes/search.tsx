import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { searchManga, getPopularManga } from "@/lib/manga";
import { MangaCard } from "@/components/MangaCard";

export const Route = createFileRoute("/search")({ component: SearchPage });

function SearchPage() {
  const [q, setQ] = useState("");
  const popularQ = useQuery({ queryKey: ["manga", "popular"], queryFn: () => getPopularManga() });
  const resultsQ = useQuery({
    queryKey: ["manga", "search", q],
    queryFn: () => searchManga(q),
    enabled: q.trim().length >= 2,
  });
  const showing = q.trim().length >= 2 ? resultsQ.data : popularQ.data;
  const loading = q.trim().length >= 2 ? resultsQ.isFetching : popularQ.isFetching;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold sm:text-4xl"><span className="text-gradient">Find manga</span></h1>
      <p className="mt-1 text-sm text-muted-foreground">Search title, author, or genre.</p>
      <div className="mt-6 flex items-center gap-2 rounded-full glass px-4 py-2.5">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Berserk, Vagabond, JJK..." className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>
      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {q.trim().length >= 2 ? `Results for "${q}"` : "Popular this week"}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {(showing ?? []).map((m) => (<MangaCard key={m.id} {...m} />))}
          {!loading && showing?.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">No results.</p>
          )}
          {loading && !showing?.length && Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    </main>
  );
}
