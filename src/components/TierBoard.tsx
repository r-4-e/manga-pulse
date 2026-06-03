import { useState } from "react";
import { X } from "lucide-react";
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
  const [activeId, setActiveId] = useState<string | null>(null);

  // Touch sensor with a small delay so taps (e.g. tier letter buttons in search
  // results) still register as clicks. Mouse uses tiny distance to start drag.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function emit(next: TierItems, nextPool: TierItem[]) {
    onChange?.(next, nextPool);
  }

  function findItem(id: string): { item: TierItem; from: Tier } | null {
    const inPool = pool.find((i) => i.id === id);
    if (inPool) return { item: inPool, from: "POOL" };
    for (const t of TIERS) {
      const found = items[t]?.find((i) => i.id === id);
      if (found) return { item: found, from: t };
    }
    return null;
  }

  function moveTo(id: string, target: Tier) {
    const found = findItem(id);
    if (!found) return;
    const { item, from } = found;
    if (from === target) return;
    let nextPool = pool;
    let nextItems = items;
    if (from === "POOL") {
      nextPool = pool.filter((i) => i.id !== id);
    } else {
      nextItems = { ...items, [from]: items[from].filter((i) => i.id !== id) };
    }
    if (target === "POOL") {
      nextPool = [...nextPool, item];
    } else {
      nextItems = { ...nextItems, [target]: [...(nextItems[target] ?? []), item] };
    }
    setItems(nextItems);
    setPool(nextPool);
    emit(nextItems, nextPool);
  }

  function removeItem(id: string, from: Tier) {
    const found = findItem(id);
    if (!found) return;
    if (from === "POOL") {
      const next = pool.filter((i) => i.id !== id);
      setPool(next);
      emit(items, next);
    } else {
      const next = { ...items, [from]: items[from].filter((i) => i.id !== id) };
      setItems(next);
      emit(next, pool);
    }
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    moveTo(String(e.active.id), e.over.id as Tier);
  }

  const activeItem = activeId ? findItem(activeId)?.item ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="space-y-3">
        {TIERS.map((tier) => (
          <TierRow key={tier} tier={tier}>
            {items[tier]?.map((it) => (
              <DraggableChip
                key={it.id}
                item={it}
                from={tier}
                onRemove={() => removeItem(it.id, tier)}
              />
            ))}
          </TierRow>
        ))}

        <PoolDrop>
          {pool.map((it) => (
            <DraggableChip key={it.id} item={it} from="POOL" />
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

function TierRow({ tier, children }: { tier: (typeof TIERS)[number]; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: tier });
  return (
    <div
      ref={setNodeRef}
      className={`flex overflow-hidden rounded-xl glass transition-colors ${
        isOver ? "ring-2 ring-primary" : ""
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

function PoolDrop({ children }: { children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: "POOL" });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl glass p-3 transition-colors ${
        isOver ? "ring-2 ring-primary" : ""
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
  onRemove,
}: {
  item: TierItem;
  from: Tier;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { from },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: "none" }}
      className="group relative w-14 cursor-grab overflow-hidden rounded-lg border border-white/10 active:cursor-grabbing sm:w-16"
      title={item.title}
    >
      <ChipImage item={item} />
      {onRemove && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute right-0.5 top-0.5 hidden h-5 w-5 place-items-center rounded-full bg-background/90 text-foreground group-hover:grid"
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
        dragging ? "shadow-2xl ring-2 ring-primary" : ""
      }`}
    >
      <ChipImage item={item} />
    </div>
  );
}
