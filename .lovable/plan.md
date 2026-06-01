## 1. Fix mobile tier search + easier ranking (`src/routes/tier.new.tsx`, `src/components/TierBoard.tsx`)

**Bug**: On mobile, typing "Vagabond" shows no results. The search results grid sits inside a glass card, but the `<input>` is wrapped in a flex row that lets the input fill width; results render below but get hidden because the parent `flex items-center` collapses height and on small screens the dropdown is invisible. Also `searchManga` is a server fn — once we go static (step 4) it must call MangaDex from the browser.

Changes:
- Move search results into a dedicated `<div>` (not inside the input row).
- Show search loading/empty/error states clearly ("Searching…", "No results", "Failed").
- Add a **direct "Add to tier" menu** on each search result and each pool chip — tap a result → pick S/A/B/C/D/F in a popover → it lands directly in that tier (no two-step tap-then-tap).
- Keep drag-and-drop for desktop; tap-to-select still works on mobile.
- Make tier rows slightly taller on small screens so chips are easier to hit.

## 2. Manga DNA + "For You" page (`src/routes/me.tsx` or new `src/routes/dna.tsx`)

Compute a taste profile from three sources stored in Supabase:
- `profiles.manga_dna` (onboarding answers — genres, themes)
- `tier_lists.items` for the user (S/A weighted positive, D/F negative)
- `opinions` + `opinion_votes` by the user (upvoted opinions = positive signal for that manga's genres)

Logic (pure client, no server fn):
- Pull all user's tier lists + opinions + profile via supabase client.
- For each manga id encountered, look up `manga_cache.genres`; score genres: S=+5, A=+3, B=+1, D=-2, F=-4, plus onboarding genre weights.
- Show top genres as a "DNA" bar chart + tags ("You're 32% Seinen, 24% Dark Fantasy…").
- Recommendations: query `manga_cache` ordered by `rating desc` filtered to top genres, excluding manga already on user's tier lists. Render as a `MangaCard` grid.

Add a "Me" link in nav already exists → put DNA at `/me` as a new section, plus a dedicated `/foryou` route for the recs grid. Add bottom-nav doesn't change (Me stays).

## 3. Static SPA build for Netlify

Goal: `bun run build` produces a static `dist/` Netlify can serve with no functions.

Changes:
- `vite.config.ts`: switch TanStack Start to SPA / prerender mode (`spa: { enabled: true, prerender: { enabled: false } }`) or replace the Start plugin with plain `@vitejs/plugin-react` + `@tanstack/router-plugin/vite` so the build emits a pure SPA.
- Delete server-only routes that won't work statically:
  - `src/routes/api.cover.tsx` (cover proxy) — replace usages with direct `https://uploads.mangadex.org/covers/{id}/{file}.256.jpg` URLs in `CoverImg` and `MangaCard`.
  - `src/routes/api.og.tier.$id.tsx` — remove dynamic OG; keep a static default og:image.
- Convert all `createServerFn` callers to call Supabase directly from the browser via the existing `supabase` client. RLS already protects writes; reads of `tier_lists`, `opinions`, `manga_cache`, `profiles` are all public-read per current policies.
  - `src/lib/manga.functions.ts` → `src/lib/manga.ts` (browser fetch to MangaDex + cache to `manga_cache` via supabase upsert).
  - `src/lib/tier-lists.functions.ts` → `src/lib/tier-lists.ts` (direct supabase calls).
  - `src/lib/opinions.functions.ts` → `src/lib/opinions.ts` (direct supabase calls).
- Remove `src/start.ts` server entry, `src/server.ts`, `attachSupabaseAuth`, `requireSupabaseAuth` middleware, and the auth-attacher wiring.
- Add `public/_redirects` with `/* /index.html 200` so client-side routing works on Netlify.
- Add `netlify.toml` with build command `bun run build`, publish dir `dist`, and a Node version pin.
- Remove `cf:` Cloudflare-only cache hints (no longer reachable anyway).

## 4. Verification

- `bun run build` succeeds with no `[unenv]` or `[import-protection]` errors.
- Preview: mobile width 375 — search "Vagabond" → results appear → tap S → chip lands in S row.
- `/me` shows DNA bars; `/foryou` shows a rec grid.
- `dist/index.html` + `dist/_redirects` exist; no `dist/_worker.js`.

## Technical notes

- Going SPA loses SSR, so `head()` metadata becomes client-only (fine for app; SEO not a priority for a logged-in tool).
- Manga cover URLs from MangaDex don't require auth and respond with permissive CORS; `referrerPolicy="no-referrer"` is enough.
- Onboarding-driven recs still work without server fns because `manga_cache` is public-read.

```text
src/
  lib/
    manga.ts          (was manga.functions.ts)
    tier-lists.ts     (was tier-lists.functions.ts)
    opinions.ts       (was opinions.functions.ts)
    dna.ts            (new — scoring + rec query)
  routes/
    me.tsx            (adds DNA section)
    foryou.tsx        (new — recommendation grid)
    tier.new.tsx      (fixed search, quick-rank popover)
  components/
    TierBoard.tsx     (quick-rank popover on chips)
public/
  _redirects          (/* /index.html 200)
netlify.toml          (build settings)
```
