import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Flame, ThumbsUp, ThumbsDown, Skull, Brain, Moon, Gem, Package, Mountain } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "@tanstack/react-router";
import type { OpinionWithStats, VoteKind } from "@/lib/opinions";
import { voteOpinion } from "@/lib/opinions";
import { useAuth } from "@/lib/auth-context";

const REACTIONS: { kind: VoteKind; icon: React.ReactNode; label: string }[] = [
  { kind: "strong_agree", icon: <Flame className="h-3.5 w-3.5" />, label: "🔥" },
  { kind: "agree", icon: <ThumbsUp className="h-3.5 w-3.5" />, label: "✓" },
  { kind: "disagree", icon: <ThumbsDown className="h-3.5 w-3.5" />, label: "✗" },
  { kind: "strong_disagree", icon: <Skull className="h-3.5 w-3.5" />, label: "☠" },
  { kind: "well_explained", icon: <Brain className="h-3.5 w-3.5" />, label: "🧠" },
  { kind: "poor_argument", icon: <Moon className="h-3.5 w-3.5" />, label: "💤" },
  { kind: "unique", icon: <Gem className="h-3.5 w-3.5" />, label: "💎" },
  { kind: "common", icon: <Package className="h-3.5 w-3.5" />, label: "📦" },
  { kind: "controversial", icon: <Mountain className="h-3.5 w-3.5" />, label: "🌋" },
];

export function OpinionCard({ opinion }: { opinion: OpinionWithStats }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  async function react(kind: VoteKind) {
    if (!user) {
      toast.error("Sign in to vote");
      navigate({ to: "/auth" });
      return;
    }
    setPending(kind);
    try {
      await voteOpinion(opinion.id, kind);
      await qc.invalidateQueries({ queryKey: ["opinions"] });
    } catch (e: any) {
      toast.error(e.message ?? "Vote failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <article className="rounded-2xl glass p-4 transition-all hover:border-white/15">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {opinion.is_anonymous ? (
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium">Anon</span>
          ) : (
            <Link to="/u/$username" params={{ username: opinion.author?.username ?? "" }} className="hover:text-foreground">
              @{opinion.author?.username}
            </Link>
          )}
          {opinion.manga_title && (<><span>·</span><span className="text-primary">{opinion.manga_title}</span></>)}
        </span>
        <span className="font-mono text-xs">{opinion.score} pts</span>
      </div>
      <h3 className="font-display text-lg font-bold leading-snug">{opinion.title}</h3>
      {opinion.body && <p className="mt-1.5 text-sm text-muted-foreground">{opinion.body}</p>}
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Stat label="Agreement" value={`${opinion.agreement_pct}%`} />
        <Stat label="Controversy" value={`${opinion.controversy}%`} />
        <Stat label="Votes" value={String(Object.values(opinion.votes).reduce((a, b) => a + b, 0))} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {REACTIONS.map((r) => (
          <button key={r.kind} onClick={() => react(r.kind)} disabled={pending === r.kind} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs transition-all hover:border-primary/60 hover:bg-primary/10 disabled:opacity-50">
            <span>{r.label}</span>
            <span className="font-mono text-muted-foreground">{opinion.votes[r.kind] ?? 0}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}
