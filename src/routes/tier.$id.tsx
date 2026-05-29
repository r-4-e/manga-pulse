import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getTierList } from "@/lib/tier-lists.functions";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

const qo = (id: string) =>
  queryOptions({ queryKey: ["tier", id], queryFn: () => getTierList({ data: { id } }) });

export const Route = createFileRoute("/tier/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(qo(params.id)),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Tier list"} — Mangaverse` },
      { property: "og:title", content: loaderData?.title ?? "Tier list" },
    ],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-center">Failed: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Not found</div>,
  component: ViewTier,
});

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
  const author = (data as any).profiles;

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
        <button
          onClick={share}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gradient-primary)] px-4 py-2 text-sm font-semibold text-background glow-magenta"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>

      <div className="space-y-2">
        {TIERS.map((t) => (
          <div key={t} className="flex overflow-hidden rounded-xl glass">
            <div
              className="grid w-14 shrink-0 place-items-center font-display text-2xl font-black text-background sm:w-20 sm:text-3xl"
              style={{ background: TIER_COLOR[t] }}
            >
              {t}
            </div>
            <div className="flex min-h-[80px] flex-1 flex-wrap gap-2 p-2">
              {(items[t] ?? []).map((it) => (
                <Link
                  key={it.id}
                  to="/manga/$id"
                  params={{ id: it.id }}
                  className="w-14 overflow-hidden rounded-lg border border-white/10 sm:w-16"
                  title={it.title}
                >
                  {it.cover_url ? (
                    <img src={it.cover_url} alt={it.title} referrerPolicy="no-referrer" className="aspect-[2/3] w-full object-cover" />
                  ) : (
                    <div className="grid aspect-[2/3] place-items-center bg-muted px-1 text-[9px]">{it.title.slice(0, 20)}</div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
