import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — Mangaverse" },
      { name: "description", content: "Tell us your manga taste to unlock your DNA." },
    ],
  }),
  component: Onboarding,
});

type Question = {
  id: string;
  q: string;
  sub?: string;
  options: { value: string; label: string; emoji?: string }[];
  multi?: boolean;
};

const QUESTIONS: Question[] = [
  {
    id: "experience",
    q: "How deep are you in manga?",
    options: [
      { value: "casual", label: "Casual — a few titles", emoji: "🌱" },
      { value: "regular", label: "Regular reader", emoji: "📚" },
      { value: "hardcore", label: "Hardcore — I read everything", emoji: "🔥" },
      { value: "elitist", label: "Manga > Anime, always", emoji: "🧠" },
    ],
  },
  {
    id: "genres",
    q: "Pick your favorite genres",
    sub: "Choose up to 4",
    multi: true,
    options: [
      { value: "shonen", label: "Shonen", emoji: "⚔️" },
      { value: "seinen", label: "Seinen", emoji: "🩸" },
      { value: "romance", label: "Romance", emoji: "💞" },
      { value: "horror", label: "Horror", emoji: "👁️" },
      { value: "slice", label: "Slice of life", emoji: "🍵" },
      { value: "isekai", label: "Isekai", emoji: "🌀" },
      { value: "sports", label: "Sports", emoji: "🏐" },
      { value: "psychological", label: "Psychological", emoji: "🧩" },
    ],
  },
  {
    id: "vibe",
    q: "What hits hardest for you?",
    options: [
      { value: "characters", label: "Deep characters", emoji: "🫀" },
      { value: "world", label: "World-building", emoji: "🗺️" },
      { value: "fights", label: "Insane fight scenes", emoji: "💥" },
      { value: "story", label: "Mind-bending story", emoji: "🌌" },
      { value: "art", label: "Top-tier art", emoji: "🎨" },
    ],
  },
  {
    id: "ending",
    q: "Endings — your stance?",
    options: [
      { value: "happy", label: "Give me catharsis", emoji: "🌈" },
      { value: "tragic", label: "Break my heart", emoji: "💔" },
      { value: "open", label: "Open & ambiguous", emoji: "🌫️" },
      { value: "bittersweet", label: "Bittersweet wins", emoji: "🥲" },
    ],
  },
  {
    id: "hottake",
    q: "Pick the take you most agree with",
    options: [
      { value: "op_mid", label: "One Piece pacing is rough", emoji: "🌊" },
      { value: "aot_goat", label: "AOT is the GOAT", emoji: "🗡️" },
      { value: "berserk_top", label: "Berserk is peak fiction", emoji: "🌑" },
      { value: "modern_better", label: "Modern manga > classics", emoji: "✨" },
      { value: "classics_better", label: "Classics > modern", emoji: "📜" },
    ],
  },
];

function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="grid min-h-[60vh] place-items-center text-muted-foreground">Loading…</div>;
  }

  const q = QUESTIONS[step];
  const current = answers[q.id];
  const canNext = q.multi ? Array.isArray(current) && current.length > 0 : !!current;
  const isLast = step === QUESTIONS.length - 1;

  function toggle(value: string) {
    if (q.multi) {
      const arr = Array.isArray(current) ? [...current] : [];
      const i = arr.indexOf(value);
      if (i >= 0) arr.splice(i, 1);
      else if (arr.length < 4) arr.push(value);
      setAnswers({ ...answers, [q.id]: arr });
    } else {
      setAnswers({ ...answers, [q.id]: value });
    }
  }

  async function finish() {
    setSaving(true);
    try {
      const payload = { ...answers, completed_at: new Date().toISOString() };
      const { error } = await supabase
        .from("profiles")
        .update({ manga_dna: payload })
        .eq("id", user!.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["profile", user!.id, "dna"] });
      toast.success("Your Manga DNA is locked in 🔥");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-6 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Step {step + 1} of {QUESTIONS.length}
      </div>

      <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-foreground transition-all"
          style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
        />
      </div>

      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{q.q}</h1>
      {q.sub && <p className="mt-1 text-sm text-muted-foreground">{q.sub}</p>}

      <div className="mt-6 grid gap-2">
        {q.options.map((opt) => {
          const selected = q.multi
            ? Array.isArray(current) && current.includes(opt.value)
            : current === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm transition-colors ${
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              {opt.emoji && <span className="text-lg">{opt.emoji}</span>}
              <span className="font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-muted-foreground disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {isLast ? (
          <button
            onClick={finish}
            disabled={!canNext || saving}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Finish
          </button>
        ) : (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </main>
  );
}
