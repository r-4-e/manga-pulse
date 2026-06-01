import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { Flame, Swords, Sparkles, TrendingUp, Search, ArrowRight, Wand2 } from "lucide-react";
import { getFeaturedManga } from "@/lib/manga";
import { MangaCard } from "@/components/MangaCard";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

const featuredQO = queryOptions({
  queryKey: ["manga", "featured"],
  queryFn: () => getFeaturedManga().catch(() => []),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredQO),
  errorComponent: ({ error }) => <div className="p-8 text-center">Failed: {error.message}</div>,
  component: Index,
});

function Index() {
  const { data } = useSuspenseQuery(featuredQO);
  return (
    <main>
      <OnboardingBanner />
      <section className="relative overflow-hidden border-b border-border">
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Beta · join the first 1,000 critics
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Your manga taste,<br />measured & debated.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Rank arcs. Post hot takes. Defend your opinion. Compare DNA with other fans.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/search" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold hover:bg-muted">
                <Search className="h-4 w-4" /> Browse manga
              </Link>
            </div>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
            <Feature icon={<Flame className="h-4 w-4" />} title="Tier rankings" body="Tap a manga, tap a tier. Done." />
            <Feature icon={<Swords className="h-4 w-4" />} title="Opinion arena" body="Drop hot takes. Real users vote." />
            <Feature icon={<TrendingUp className="h-4 w-4" />} title="Manga DNA" body="Your taste, distilled into recs you'll actually like." />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Legends to rank</h2>
            <p className="mt-1 text-sm text-muted-foreground">The classics fans love to debate.</p>
          </div>
          <Link to="/search" className="text-sm font-medium text-foreground hover:underline">Browse all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {(data ?? []).map((m) => (<MangaCard key={m.id} {...m} />))}
          {!data?.length && Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </section>
    </main>
  );
}

function OnboardingBanner() {
  const { user, loading } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id, "dna"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("manga_dna").eq("id", user!.id).maybeSingle();
      return data;
    },
  });
  if (loading || !user) return null;
  if (profile?.manga_dna) return null;
  return (
    <div className="border-b border-border bg-muted/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background">
            <Wand2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Finish your Manga DNA</p>
            <p className="text-xs text-muted-foreground">Answer 5 quick questions to unlock recommendations.</p>
          </div>
        </div>
        <Link to="/onboarding" className="inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90">
          Complete onboarding <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-left">
      <div className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-muted text-foreground">{icon}</div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
