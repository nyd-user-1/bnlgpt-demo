import { useResearchFeed } from "@/hooks/useResearchFeed";
import { FeedHeader } from "./FeedHeader";
import { FeedItem } from "./FeedItem";

interface ResearchFeedProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function ResearchFeed({ isOpen, onClose: _onClose }: ResearchFeedProps) {
  const { events } = useResearchFeed();

  return (
    <aside
      className={`${
        isOpen ? "w-[300px]" : "w-0"
      } flex-shrink-0 transition-all duration-200 ease-in-out fixed inset-y-0 right-0 z-50 md:relative md:inset-auto md:z-auto ${
        isOpen ? "overflow-visible" : "overflow-hidden"
      }`}
    >
      <div className="w-[300px] h-full flex flex-col bg-background">
        <FeedHeader />

        <div className="flex-1 overflow-y-auto">
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
