import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getManga } from "@/lib/manga";
import { Calendar, User2, Tag, BookOpen, Plus, Swords } from "lucide-react";

const qo = (id: string) =>
  queryOptions({
    queryKey: ["manga", id],
    queryFn: async () => {
      const m = await getManga(id);
      if (!m) throw notFound();
      return m;
    },
    retry: false,
  });

export const Route = createFileRoute("/manga/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(qo(params.id)),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-display text-5xl font-bold">404</h1>
      <h2 className="mt-3 text-lg font-semibold">Couldn't load this manga</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background">Home</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-display text-5xl font-bold">404</h1>
      <h2 className="mt-3 text-lg font-semibold">Manga not found</h2>
      <p className="mt-2 text-sm text-muted-foreground">That ID doesn't match anything on MangaDex.</p>
      <Link to="/search" className="mt-6 inline-block rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background">Search manga</Link>
    </div>
  ),
  component: MangaDetail,
});

function MangaDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(qo(id));
  if (!data) return <div className="p-8 text-center">Not found.</div>;
  return (
    <main className="relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-cover bg-center opacity-40 blur-2xl" style={{ backgroundImage: data.cover_url ? `url(${data.cover_url})` : undefined }} />
      <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-background/40 via-background/80 to-background" />
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
          <div className="mx-auto w-40 sm:mx-0 sm:w-full">
            {data.cover_url ? (
              <img src={data.cover_url} alt={data.title} referrerPolicy="no-referrer" className="aspect-[2/3] w-full rounded-xl object-cover shadow-2xl glow-magenta" />
            ) : (
              <div className="grid aspect-[2/3] place-items-center rounded-xl bg-muted">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{data.title}</h1>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {data.author && (<span className="flex items-center gap-1"><User2 className="h-3.5 w-3.5" /> {data.author}</span>)}
              {data.year && (<span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {data.year}</span>)}
              {data.status && (<span className="rounded-full bg-white/5 px-2 py-0.5 text-xs capitalize">{data.status}</span>)}
            </div>
            {data.genres?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {data.genres.slice(0, 10).map((g) => (
                  <span key={g} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
                    <Tag className="h-2.5 w-2.5" /> {g}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/tier/new" search={{ add: id }} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gradient-primary)] px-4 py-2 text-sm font-semibold text-background glow-magenta">
                <Plus className="h-4 w-4" /> Add to tier list
              </Link>
              <Link to="/opinions" search={{ manga: id, title: data.title }} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold">
                <Swords className="h-4 w-4" /> Post hot take
              </Link>
            </div>
          </div>
        </div>
        {data.description && (
          <section className="mt-8 rounded-2xl glass p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Synopsis</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{data.description}</p>
          </section>
        )}
      </div>
    </main>
  );
}
