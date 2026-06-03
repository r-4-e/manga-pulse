import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getTierList } from "@/lib/tier-lists";
import { Share2, Plus, Compass } from "lucide-react";
import { toast } from "sonner";
import { CoverImg } from "@/components/CoverImg";

const qo = (id: string) =>
  queryOptions({
    queryKey: ["tier", id],
    queryFn: () => getTierList(id),
    retry: false,
  });

export const Route = createFileRoute("/tier/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient
      .ensureQueryData(qo(params.id))
      .catch(() => null);
    if (!data) throw notFound();
    return data;
  },
  errorComponent: ({ error }) => (
    <NotFoundCard message="We couldn't load that tier list." detail={error.message} />
  ),
  notFoundComponent: () => (
    <NotFoundCard
      message="Tier list not found"
      detail="It may have been deleted, set to private, or the link is wrong."
    />
  ),
  component: ViewTier,
});

function NotFoundCard({ message, detail }: { message: string; detail?: string }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-display text-6xl font-bold">404</h1>
      <h2 className="mt-3 text-lg font-semibold">{message}</h2>
      {detail && <p className="mt-2 text-sm text-muted-foreground">{detail}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          to="/tier/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background"
        >
          <Plus className="h-4 w-4" /> Create a tier list
        </Link>
        <Link
          to="/search"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-sm font-semibold"
        >
          <Compass className="h-4 w-4" /> Browse manga
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Home
        </Link>
      </div>
    </main>
  );
}

const TIERS = ["S", "A", "B", "C", "D", "F"] as const;
const TIER_COLOR: Record<string, string> = {
  S: "var(--tier-s)", A: "var(--tier-a)", B: "var(--tier-b)",
  C: "var(--tier-c)", D: "var(--tier-d)", F: "var(--tier-f)",
};

function ViewTier() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(qo(id));
  if (!data) return <div className="p-8 text-center">Not found</div>;
  const items = (data.items ?? {}) as Record<string, { id: string; title: string; cover_url?: string }[]>;
  const author = data.author;

  function share() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{data.title}</h1>
          {author && (
            <Link to="/u/$username" params={{ username: author.username }} className="text-sm text-muted-foreground hover:text-primary">
              by @{author.username}
            </Link>
          )}
        </div>
        <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gradient-primary)] px-4 py-2 text-sm font-semibold text-background glow-magenta">
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>
      <div className="space-y-2">
        {TIERS.map((t) => (
          <div key={t} className="flex overflow-hidden rounded-xl glass">
            <div className="grid w-14 shrink-0 place-items-center font-display text-2xl font-black text-background sm:w-20 sm:text-3xl" style={{ background: TIER_COLOR[t] }}>
              {t}
            </div>
            <div className="flex min-h-[80px] flex-1 flex-wrap gap-2 p-2">
              {(items[t] ?? []).map((it) => (
                <Link key={it.id} to="/manga/$id" params={{ id: it.id }} className="w-14 overflow-hidden rounded-lg border border-border sm:w-16" title={it.title}>
                  <CoverImg src={it.cover_url ?? null} alt={it.title} className="aspect-[2/3] w-full" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
