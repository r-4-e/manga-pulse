import { useState, type DragEvent } from "react";
import { X } from "lucide-react";

export interface TierItem {
  id: string;
  title: string;
  cover_url?: string | null;
}
export type TierItems = Record<string, TierItem[]>;

const TIERS = ["S", "A", "B", "C", "D", "F"] as const;
type Tier = (typeof TIERS)[number] | "POOL";

const TIER_COLOR: Record<string, string> = {
  S: "var(--tier-s)",
  A: "var(--tier-a)",
  B: "var(--tier-b)",
  C: "var(--tier-c)",
  D: "var(--tier-d)",
  F: "var(--tier-f)",
};

interface Props {
  initial?: TierItems;
  pool: TierItem[];
  onChange?: (items: TierItems, pool: TierItem[]) => void;
}

export function TierBoard({ initial, pool: initialPool, onChange }: Props) {
  const [items, setItems] = useState<TierItems>(
    initial ?? Object.fromEntries(TIERS.map((t) => [t, []])),
  );
  const [pool, setPool] = useState<TierItem[]>(initialPool);
  const [dragged, setDragged] = useState<{ id: string; from: Tier } | null>(null);

  function emit(next: TierItems, nextPool: TierItem[]) {
    onChange?.(next, nextPool);
  }

  function findItem(id: string, from: Tier): TierItem | undefined {
    if (from === "POOL") return pool.find((i) => i.id === id);
    return items[from]?.find((i) => i.id === id);
  }

  function removeFrom(id: string, from: Tier) {
    if (from === "POOL") {
      const next = pool.filter((i) => i.id !== id);
      setPool(next);
      return next;
    }
    setItems((prev) => {
      const next = { ...prev, [from]: prev[from].filter((i) => i.id !== id) };
      return next;
    });
    return null;
  }

  function handleDrop(target: Tier, e: DragEvent) {
    e.preventDefault();
    if (!dragged) return;
    const item = findItem(dragged.id, dragged.from);
    if (!item) return;

    // Remove from origin
    let nextPool = pool;
    let nextItems = items;
    if (dragged.from === "POOL") {
      nextPool = pool.filter((i) => i.id !== dragged.id);
    } else {
      nextItems = { ...items, [dragged.from]: items[dragged.from].filter((i) => i.id !== dragged.id) };
    }
    // Add to target
    if (target === "POOL") {
      nextPool = [...nextPool, item];
    } else {
      nextItems = { ...nextItems, [target]: [...(nextItems[target] ?? []), item] };
    }
    setItems(nextItems);
    setPool(nextPool);
    setDragged(null);
    emit(nextItems, nextPool);
  }

  function handleDragStart(id: string, from: Tier) {
    setDragged({ id, from });
  }

  // Mobile tap-to-place
  const [selected, setSelected] = useState<{ id: string; from: Tier } | null>(null);
  function tap(id: string, from: Tier) {
    if (!selected) return setSelected({ id, from });
    if (selected.id === id) return setSelected(null);
  }
  function tapTier(target: Tier) {
    if (!selected) return;
    const item = findItem(selected.id, selected.from);
    if (!item) return setSelected(null);
    let nextPool = pool;
    let nextItems = items;
    if (selected.from === "POOL") nextPool = pool.filter((i) => i.id !== selected.id);
    else nextItems = { ...items, [selected.from]: items[selected.from].filter((i) => i.id !== selected.id) };
    if (target === "POOL") nextPool = [...nextPool, item];
    else nextItems = { ...nextItems, [target]: [...(nextItems[target] ?? []), item] };
    setItems(nextItems);
    setPool(nextPool);
    setSelected(null);
    emit(nextItems, nextPool);
  }

  return (
    <div className="space-y-3">
      {TIERS.map((tier) => (
        <div
          key={tier}
          className="flex overflow-hidden rounded-xl glass"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(tier, e)}
          onClick={() => tapTier(tier)}
        >
          <div
            className="grid w-14 shrink-0 place-items-center font-display text-2xl font-black text-background sm:w-20 sm:text-3xl"
            style={{ background: TIER_COLOR[tier] }}
          >
            {tier}
          </div>
          <div className="flex min-h-[80px] flex-1 flex-wrap gap-2 p-2">
            {items[tier]?.map((it) => (
              <ItemChip
                key={it.id}
                item={it}
                onDragStart={() => handleDragStart(it.id, tier)}
                onTap={(e) => {
                  e.stopPropagation();
                  tap(it.id, tier);
                }}
                selected={selected?.id === it.id}
                onRemove={() => {
                  removeFrom(it.id, tier);
                  setPool((p) => [...p, it]);
                  emit({ ...items, [tier]: items[tier].filter((x) => x.id !== it.id) }, [...pool, it]);
                }}
              />
            ))}
          </div>
        </div>
      ))}

      <div
        className="rounded-xl glass p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop("POOL", e)}
        onClick={() => tapTier("POOL")}
      >
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Unranked pool {selected && "— tap a tier above"}
        </h3>
        <div className="flex min-h-[80px] flex-wrap gap-2">
          {pool.map((it) => (
            <ItemChip
              key={it.id}
              item={it}
              onDragStart={() => handleDragStart(it.id, "POOL")}
              onTap={(e) => {
                e.stopPropagation();
                tap(it.id, "POOL");
              }}
              selected={selected?.id === it.id}
            />
          ))}
          {pool.length === 0 && (
            <p className="text-sm text-muted-foreground">Add manga from search to start ranking.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemChip({
  item,
  onDragStart,
  onRemove,
  onTap,
  selected,
}: {
  item: TierItem;
  onDragStart: () => void;
  onRemove?: () => void;
  onTap?: (e: React.MouseEvent) => void;
  selected?: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onTap}
      className={`group relative w-14 cursor-grab overflow-hidden rounded-lg border transition-all active:cursor-grabbing sm:w-16 ${
        selected ? "border-primary glow-magenta scale-110" : "border-white/10"
      }`}
      title={item.title}
    >
      {item.cover_url ? (
        <img src={item.cover_url} alt={item.title} className="aspect-[2/3] w-full object-cover" />
      ) : (
        <div className="grid aspect-[2/3] place-items-center bg-muted text-[9px] text-center px-1">
          {item.title.slice(0, 20)}
        </div>
      )}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute right-0.5 top-0.5 hidden h-5 w-5 place-items-center rounded-full bg-background/90 text-foreground group-hover:grid"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
