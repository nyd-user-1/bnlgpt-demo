import type { TrendingItem } from "@/hooks/useResearchFeed";

interface TrendingStripProps {
  items: TrendingItem[];
}

export function TrendingStrip({ items }: TrendingStripProps) {
  if (items.length === 0) {
    return (
      <div className="px-4 py-2">
        <p className="text-[10px] text-muted-foreground/60">
          No trending topics yet
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="flex flex-nowrap gap-1.5 overflow-hidden">
        {items.map((item) => (
          <span
            key={item.value}
            className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground/80 hover:bg-foreground/15 transition-colors cursor-default"
          >
            {item.value}
          </span>
        ))}
      </div>
    </div>
  );
}
