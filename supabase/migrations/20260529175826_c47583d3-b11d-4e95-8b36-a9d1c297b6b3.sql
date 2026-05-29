
-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  manga_dna JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'user'
  );
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  IF length(base_username) < 3 THEN base_username := 'user' || substr(NEW.id::text, 1, 6); END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, final_username, COALESCE(NEW.raw_user_meta_data->>'full_name', final_username), NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- MANGA CACHE
CREATE TABLE public.manga_cache (
  id TEXT PRIMARY KEY, -- external API id
  source TEXT NOT NULL DEFAULT 'mangadex',
  title TEXT NOT NULL,
  alt_titles TEXT[],
  author TEXT,
  cover_url TEXT,
  description TEXT,
  status TEXT,
  year INT,
  genres TEXT[],
  rating NUMERIC,
  raw JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.manga_cache TO anon, authenticated;
GRANT ALL ON public.manga_cache TO service_role;
ALTER TABLE public.manga_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manga cache readable by all" ON public.manga_cache FOR SELECT USING (true);

-- TIER LISTS
CREATE TABLE public.tier_lists (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'overall', -- overall, arcs, emotional, writing, characters, peak, reread, ending
  items JSONB NOT NULL DEFAULT '{}'::jsonb, -- { S: [{id,title,cover}], A: [...], ... }
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tier_lists_user_idx ON public.tier_lists(user_id);
GRANT SELECT ON public.tier_lists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tier_lists TO authenticated;
GRANT ALL ON public.tier_lists TO service_role;
ALTER TABLE public.tier_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public tier lists viewable" ON public.tier_lists FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users insert own tier lists" ON public.tier_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tier lists" ON public.tier_lists FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tier lists" ON public.tier_lists FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- OPINIONS
CREATE TABLE public.opinions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manga_id TEXT REFERENCES public.manga_cache(id) ON DELETE SET NULL,
  manga_title TEXT,
  title TEXT NOT NULL,
  body TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX opinions_user_idx ON public.opinions(user_id);
CREATE INDEX opinions_created_idx ON public.opinions(created_at DESC);
GRANT SELECT ON public.opinions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opinions TO authenticated;
GRANT ALL ON public.opinions TO service_role;
ALTER TABLE public.opinions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Opinions viewable by all" ON public.opinions FOR SELECT USING (true);
CREATE POLICY "Users insert own opinions" ON public.opinions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own opinions" ON public.opinions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own opinions" ON public.opinions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- OPINION VOTES
CREATE TYPE public.vote_kind AS ENUM ('agree','strong_agree','disagree','strong_disagree','well_explained','poor_argument','unique','common','controversial');

CREATE TABLE public.opinion_votes (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  opinion_id UUID NOT NULL REFERENCES public.opinions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.vote_kind NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(opinion_id, user_id, kind)
);
CREATE INDEX opinion_votes_opinion_idx ON public.opinion_votes(opinion_id);
GRANT SELECT ON public.opinion_votes TO anon;
GRANT SELECT, INSERT, DELETE ON public.opinion_votes TO authenticated;
GRANT ALL ON public.opinion_votes TO service_role;
ALTER TABLE public.opinion_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes viewable by all" ON public.opinion_votes FOR SELECT USING (true);
CREATE POLICY "Users insert own votes" ON public.opinion_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own votes" ON public.opinion_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);
