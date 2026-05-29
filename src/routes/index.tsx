import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { Flame, Swords, Sparkles, TrendingUp, Search, ArrowRight } from "lucide-react";
import { getPopularManga } from "@/lib/manga.functions";
import { MangaCard } from "@/components/MangaCard";

const popularQO = queryOptions({
  queryKey: ["manga", "popular"],
  queryFn: () => getPopularManga(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(popularQO).catch(() => []),
  errorComponent: ({ error }) => <div className="p-8 text-center">Failed: {error.message}</div>,
  component: Index,
});

function Index() {
  const { data } = useQuery({ ...popularQO, retry: false });
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Beta · join the first 1,000 critics</span>
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl">
              Your manga taste,
              <br />
              <span className="text-gradient">measured & debated.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Rank arcs. Post hot takes. Defend your opinion. Compare DNA with other fans.
              Build the loudest manga identity on the internet.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--gradient-primary)] px-6 py-3 font-semibold text-background animate-pulse-glow"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/search"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 font-semibold backdrop-blur transition-colors hover:bg-white/10"
              >
                <Search className="h-4 w-4" /> Browse manga
              </Link>
            </div>
          </div>

          {/* feature grid */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
            <Feature icon={<Flame />} title="Tier rankings" body="Drag arcs into S–F. Auto-save. Share anywhere." />
            <Feature icon={<Swords />} title="Opinion arena" body="Drop hot takes. Real users vote. Defend or get demolished." />
            <Feature icon={<TrendingUp />} title="Manga DNA" body="Your taste, distilled into a card you can flex." />
          </div>
        </div>
      </section>

      {/* Popular manga */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Trending now</h2>
          <Link to="/search" className="text-sm text-primary hover:underline">
            All manga →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {(data ?? []).slice(0, 12).map((m) => (
            <MangaCard key={m.id} {...m} />
          ))}
          {!data?.length &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-muted/40" />
            ))}
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl glass p-5 text-left">
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-[var(--gradient-primary)] text-background">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
