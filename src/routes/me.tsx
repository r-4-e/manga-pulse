import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { computeMyDna, getRecommendations } from "@/lib/dna";
import { listMyTierLists } from "@/lib/tier-lists";
import { MangaCard } from "@/components/MangaCard";
import { Sparkles, Wand2, Plus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/me")({ component: Me });

function Me() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  const dnaQ = useQuery({
    queryKey: ["my-dna", user?.id],
    queryFn: () => computeMyDna(user!.id),
    enabled: !!user,
  });
  const recsQ = useQuery({
    queryKey: ["my-recs", user?.id],
    queryFn: () => getRecommendations(dnaQ.data!),
    enabled: !!dnaQ.data && dnaQ.data.topGenres.length > 0,
  });
  const tiersQ = useQuery({
    queryKey: ["my-tiers", user?.id],
    queryFn: () => listMyTierLists(),
    enabled: !!user,
  });

  if (loading || !user) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  const dna = dnaQ.data;
  const hasSignal = dna && (dna.topGenres.length > 0 || dna.hasOnboarding);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-foreground text-background">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Your Manga DNA</h1>
          <p className="text-sm text-muted-foreground">
            Built from your onboarding, tier lists, and votes.
          </p>
        </div>
      </header>

      {!dna?.hasOnboarding && (
        <Link
          to="/onboarding"
          className="mb-6 flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4 hover:bg-muted"
        >
          <div className="flex items-center gap-3">
            <Wand2 className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold">Finish onboarding</p>
              <p className="text-xs text-muted-foreground">5 questions to sharpen your DNA.</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      {/* DNA bars */}
      <section className="mb-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Genre breakdown
        </h2>
        {dnaQ.isLoading && <p className="text-sm text-muted-foreground">Crunching your taste…</p>}
        {!dnaQ.isLoading && !hasSignal && (
          <p className="text-sm text-muted-foreground">
            Rank a few manga or finish onboarding to build your DNA.
          </p>
        )}
        {hasSignal && dna && (
          <div className="space-y-2">
            {dna.topGenres.map((g) => (
              <div key={g.genre}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold">{g.genre}</span>
                  <span className="font-mono text-muted-foreground">{g.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-foreground" style={{ width: `${g.pct}%` }} />
                </div>
              </div>
            ))}
            {dna.topGenres.length === 0 && (
              <p className="text-sm text-muted-foreground">
                We need more signal — try ranking some manga.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section className="mb-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-xl font-bold">For you</h2>
          <p className="text-xs text-muted-foreground">
            Picked from your top genres.
          </p>
        </div>
        {recsQ.isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        )}
        {recsQ.data && recsQ.data.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recsQ.data.map((m) => (<MangaCard key={m.id} {...m} />))}
          </div>
        )}
        {recsQ.data && recsQ.data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Not enough cached manga to make picks yet. Search and rank more, then check back!
          </p>
        )}
      </section>

      {/* My tier lists */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-xl font-bold">Your tier lists</h2>
          <Link
            to="/tier/new"
            className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </Link>
        </div>
        {tiersQ.data && tiersQ.data.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {tiersQ.data.map((t) => (
              <Link
                key={t.id}
                to="/tier/$id"
                params={{ id: t.id }}
                className="rounded-xl border border-border bg-card p-4 hover:bg-muted"
              >
                <h3 className="font-display text-lg font-semibold">{t.title}</h3>
                <p className="mt-1 text-xs capitalize text-muted-foreground">{t.category}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tier lists yet.</p>
        )}
      </section>
    </main>
  );
}
