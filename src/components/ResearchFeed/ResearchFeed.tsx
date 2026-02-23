import { useResearchFeed } from "@/hooks/useResearchFeed";
import { FeedHeader } from "./FeedHeader";
import { FeedItem } from "./FeedItem";
import { TrendingStrip } from "./TrendingStrip";

interface ResearchFeedProps {
  isOpen: boolean;
}

export function ResearchFeed({ isOpen }: ResearchFeedProps) {
  const { events, isConnected, trending } = useResearchFeed();

  return (
    <aside
      className={`${
        isOpen ? "w-[300px]" : "w-0"
      } flex-shrink-0 transition-all duration-200 ease-in-out ${
        isOpen ? "overflow-visible" : "overflow-hidden"
      }`}
    >
      <div className="w-[300px] h-full flex flex-col bg-background">
        <FeedHeader isConnected={isConnected} />
        <TrendingStrip items={trending} />

        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {events.length === 0 ? (
            <p className="px-4 py-8 text-xs text-muted-foreground text-center">
              Activity will appear here as you explore
            </p>
          ) : (
            events.map((event) => (
              <FeedItem key={event.id} event={event} />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
