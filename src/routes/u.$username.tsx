import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getProfile, listUserTierLists } from "@/lib/tier-lists";

const qo = (username: string) =>
  queryOptions({
    queryKey: ["profile", username],
    queryFn: async () => {
      const profile = await getProfile(username);
      if (!profile) return null;
      const tiers = await listUserTierLists(username);
      return { profile, tiers };
    },
  });

export const Route = createFileRoute("/u/$username")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(qo(params.username)),
  errorComponent: ({ error }) => <div className="p-8 text-center">Failed: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">User not found</div>,
  component: Profile,
});

function Profile() {
  const { username } = Route.useParams();
  const { data } = useSuspenseQuery(qo(username));
  if (!data) return <div className="py-20 text-center text-muted-foreground">User not found</div>;
  const { profile, tiers } = data;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-4">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--gradient-primary)] text-2xl font-bold text-background glow-magenta">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            (profile.display_name ?? profile.username).charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">{profile.display_name ?? profile.username}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
        </div>
      </div>
      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl font-bold">Tier lists</h2>
        {tiers.length === 0 ? (
          <p className="text-muted-foreground">No tier lists yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tiers.map((t: any) => (
              <Link key={t.id} to="/tier/$id" params={{ id: t.id }} className="rounded-xl glass p-4 transition-all hover:glow-magenta">
                <h3 className="font-display text-lg font-semibold">{t.title}</h3>
                <p className="mt-1 text-xs capitalize text-muted-foreground">{t.category}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
