import { useEffect, useRef, useState } from "react";
import { GripVertical, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";

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

const HINT_KEY = "tier-board-hint-seen";

function haptic(pattern: number | number[] = 12) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

interface Props {
  initial?: TierItems;
  pool: TierItem[];
  onChange?: (items: TierItems, pool: TierItem[]) => void;
}

interface Snapshot {
  items: TierItems;
  pool: TierItem[];
}

export function TierBoard({ initial, pool: initialPool, onChange }: Props) {
  const [items, setItems] = useState<TierItems>(
    initial ?? Object.fromEntries(TIERS.map((t) => [t, []])),
  );
  const [pool, setPool] = useState<TierItem[]>(initialPool);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const undoRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(HINT_KEY)) setShowHint(true);
  }, []);

  function dismissHint() {
    setShowHint(false);
    try {
      window.localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function emit(next: TierItems, nextPool: TierItem[]) {
    onChange?.(next, nextPool);
  }

  function findItem(id: string): { item: TierItem; from: Tier; index: number } | null {
    const idxPool = pool.findIndex((i) => i.id === id);
    if (idxPool !== -1) return { item: pool[idxPool], from: "POOL", index: idxPool };
    for (const t of TIERS) {
      const idx = items[t]?.findIndex((i) => i.id === id) ?? -1;
      if (idx !== -1) return { item: items[t][idx], from: t, index: idx };
    }
    return null;
  }

  function applyMove(
    id: string,
    overTarget: string,
  ): { next: TierItems; nextPool: TierItem[]; movedTo: Tier } | null {
    const found = findItem(id);
    if (!found) return null;
    const { item, from } = found;

    // Determine target tier and optional insert-before id
    let targetTier: Tier;
    let beforeId: string | null = null;
    if (overTarget === "POOL" || TIERS.includes(overTarget as any)) {
      targetTier = overTarget as Tier;
    } else {
      // dropped on another chip — insert before it
      const overInfo = findItem(overTarget);
      if (!overInfo) return null;
      targetTier = overInfo.from;
      beforeId = overTarget;
    }

    let nextItems = { ...items, ...Object.fromEntries(TIERS.map((t) => [t, [...(items[t] ?? [])]])) };
    let nextPool = [...pool];

    // remove from source
    if (from === "POOL") {
      nextPool = nextPool.filter((i) => i.id !== id);
    } else {
      nextItems[from] = nextItems[from].filter((i) => i.id !== id);
    }

    // insert into target
    if (targetTier === "POOL") {
      if (beforeId) {
        const idx = nextPool.findIndex((i) => i.id === beforeId);
        if (idx === -1) nextPool.push(item);
        else nextPool.splice(idx, 0, item);
      } else {
        nextPool.push(item);
      }
    } else {
      const arr = nextItems[targetTier] ?? [];
      if (beforeId) {
        const idx = arr.findIndex((i) => i.id === beforeId);
        if (idx === -1) arr.push(item);
        else arr.splice(idx, 0, item);
      } else {
        arr.push(item);
      }
      nextItems[targetTier] = arr;
    }

    return { next: nextItems, nextPool, movedTo: targetTier };
  }

  function moveTo(id: string, overTarget: string) {
    const before: Snapshot = { items, pool };
    const result = applyMove(id, overTarget);
    if (!result) return;
    const { next, nextPool, movedTo } = result;

    // No-op detection: if state unchanged, skip toast/undo
    const sameItems = JSON.stringify(next) === JSON.stringify(items);
    const samePool = JSON.stringify(nextPool) === JSON.stringify(pool);
    if (sameItems && samePool) return;

    setItems(next);
    setPool(nextPool);
    emit(next, nextPool);
    undoRef.current = before;
    haptic([8, 30, 14]);

    const label = movedTo === "POOL" ? "pool" : `tier ${movedTo}`;
    toast.success(`Moved to ${label}`, {
      action: {
        label: "Undo",
        onClick: () => {
          setItems(before.items);
          setPool(before.pool);
          emit(before.items, before.pool);
          haptic(6);
        },
      },
      duration: 4000,
    });
  }

  function removeItem(id: string, from: Tier) {
    const before: Snapshot = { items, pool };
    if (from === "POOL") {
      const next = pool.filter((i) => i.id !== id);
      setPool(next);
      emit(items, next);
    } else {
      const next = { ...items, [from]: items[from].filter((i) => i.id !== id) };
      setItems(next);
      emit(next, pool);
    }
    haptic(10);
    toast("Removed", {
      action: {
        label: "Undo",
        onClick: () => {
          setItems(before.items);
          setPool(before.pool);
          emit(before.items, before.pool);
        },
      },
    });
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    haptic(15);
    if (showHint) dismissHint();
  }

  function handleDragOver(e: DragOverEvent) {
    setOverId(e.over ? String(e.over.id) : null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    setOverId(null);
    if (!e.over) return;
    moveTo(String(e.active.id), String(e.over.id));
  }

  const activeItem = activeId ? findItem(activeId)?.item ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOverId(null);
      }}
    >
      {showHint && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">Drag to rank</p>
            <p className="text-xs text-muted-foreground">
              Long-press a cover, then drag it into a tier. Drop on another cover to reorder.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissHint}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Got it
          </button>
        </div>
      )}

      <div className="space-y-3">
        {TIERS.map((tier) => (
          <TierRow key={tier} tier={tier} isOverTier={overId === tier}>
            {items[tier]?.map((it) => (
              <DraggableChip
                key={it.id}
                item={it}
                from={tier}
                isOver={overId === it.id && activeId !== it.id}
                onRemove={() => removeItem(it.id, tier)}
              />
            ))}
          </TierRow>
        ))}

        <PoolDrop isOverTier={overId === "POOL"}>
          {pool.map((it) => (
            <DraggableChip
              key={it.id}
              item={it}
              from="POOL"
              isOver={overId === it.id && activeId !== it.id}
            />
          ))}
          {pool.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add manga from search to start ranking, then drag into a tier.
            </p>
          )}
        </PoolDrop>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? <ChipVisual item={activeItem} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function TierRow({
  tier,
  isOverTier,
  children,
}: {
  tier: (typeof TIERS)[number];
  isOverTier: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: tier });
  return (
    <div
      ref={setNodeRef}
      className={`flex overflow-hidden rounded-xl glass transition-all ${
        isOverTier ? "scale-[1.01] ring-2 ring-primary" : ""
      }`}
    >
      <div
        className="grid w-14 shrink-0 place-items-center font-display text-2xl font-black text-background sm:w-20 sm:text-3xl"
        style={{ background: TIER_COLOR[tier] }}
      >
        {tier}
      </div>
      <div className="flex min-h-[80px] flex-1 flex-wrap gap-2 p-2">{children}</div>
    </div>
  );
}

function PoolDrop({
  isOverTier,
  children,
}: {
  isOverTier: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: "POOL" });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl glass p-3 transition-all ${
        isOverTier ? "ring-2 ring-primary" : ""
      }`}
    >
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Unranked pool — drag into a tier
      </h3>
      <div className="flex min-h-[80px] flex-wrap gap-2">{children}</div>
    </div>
  );
}

function DraggableChip({
  item,
  from,
  isOver,
  onRemove,
}: {
  item: TierItem;
  from: Tier;
  isOver?: boolean;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { from },
  });
  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: item.id,
  });

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setDropRef(node);
      }}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: "none" }}
      className={`group relative w-14 cursor-grab overflow-hidden rounded-lg border transition-all active:cursor-grabbing sm:w-16 ${
        isDropOver || isOver
          ? "border-primary ring-2 ring-primary"
          : "border-white/10"
      }`}
      title={item.title}
      aria-label={`Drag ${item.title}`}
    >
      <ChipImage item={item} />
      {/* Grab handle hint — always visible on touch, hover on desktop */}
      <span className="pointer-events-none absolute left-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-background/80 text-foreground opacity-80 sm:opacity-0 sm:group-hover:opacity-100">
        <GripVertical className="h-3 w-3" />
      </span>
      {onRemove && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-background/90 text-foreground opacity-0 group-hover:opacity-100 sm:opacity-0"
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function ChipImage({ item }: { item: TierItem }) {
  if (item.cover_url) {
    return (
      <img
        src={item.cover_url}
        alt={item.title}
        referrerPolicy="no-referrer"
        draggable={false}
        className="aspect-[2/3] w-full select-none object-cover"
      />
    );
  }
  return (
    <div className="grid aspect-[2/3] place-items-center bg-muted px-1 text-center text-[9px]">
      {item.title.slice(0, 20)}
    </div>
  );
}

function ChipVisual({ item, dragging }: { item: TierItem; dragging?: boolean }) {
  return (
    <div
      className={`w-14 overflow-hidden rounded-lg border border-primary sm:w-16 ${
        dragging ? "rotate-3 scale-110 shadow-2xl ring-2 ring-primary" : ""
      }`}
    >
      <ChipImage item={item} />
    </div>
  );
}
