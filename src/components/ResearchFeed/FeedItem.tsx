import { useNavigate } from "react-router-dom";
import {
  Search,
  MessageSquare,
  ArrowUp,
  Atom,
  FlaskConical,
  Layers,
  TrendingUp,
  Users,
  Star,
} from "lucide-react";
import type { FeedEvent } from "@/types/feed";

const INSIGHT_TYPES = new Set([
  "trending_nuclide",
  "cross_interest",
  "new_in_field",
  "high_impact_paper",
]);

const CLICKABLE_TYPES = new Set([
  "chat_started",
  "record_inquiry",
  "semantic_search",
  "keyword_search",
  "nuclide_filter",
  "reaction_filter",
  "element_range_filter",
]);

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function buildFeedItemPath(event: FeedEvent): string | null {
  const { event_type, entity_value, metadata } = event;

  switch (event_type) {
    case "chat_started": {
      const sid = metadata?.session_id as string | undefined;
      return sid ? `/c/${sid}` : null;
    }
    case "record_inquiry":
      return entity_value
        ? `/references?q=${encodeURIComponent(entity_value)}&mode=keyword`
        : null;
    case "semantic_search":
      return entity_value
        ? `/references?q=${encodeURIComponent(entity_value)}&mode=semantic`
        : null;
    case "keyword_search":
      return entity_value
        ? `/references?q=${encodeURIComponent(entity_value)}&mode=keyword`
        : null;
    case "nuclide_filter":
      return entity_value
        ? `/references?nuclide=${encodeURIComponent(entity_value)}`
        : null;
    case "reaction_filter":
      return entity_value
        ? `/references?reaction=${encodeURIComponent(entity_value)}`
        : null;
    case "element_range_filter":
      return entity_value
        ? `/references?zRange=${encodeURIComponent(entity_value)}`
        : null;
    default:
      return null;
  }
}

const ICON_MAP: Record<string, typeof Search> = {
  semantic_search: Search,
  keyword_search: Search,
  chat_started: MessageSquare,
  record_inquiry: ArrowUp,
  nuclide_filter: Atom,
  reaction_filter: FlaskConical,
  element_range_filter: Layers,
  // Insight types
  trending_nuclide: TrendingUp,
  cross_interest: Users,
  new_in_field: FlaskConical,
  high_impact_paper: Star,
  s2_citation_update: ArrowUp,
  paper_ingested: Layers,
};

const COLOR_MAP: Record<string, string> = {
  semantic_search: "text-nuclear",
  keyword_search: "text-nuclear",
  nuclide_filter: "text-nuclear",
  reaction_filter: "text-nuclear",
  element_range_filter: "text-nuclear",
  chat_started: "text-foreground",
  record_inquiry: "text-foreground",
  // Insight types
  trending_nuclide: "text-green-400",
  cross_interest: "text-green-400",
  new_in_field: "text-green-400",
  high_impact_paper: "text-green-400",
  s2_citation_update: "text-green-400",
  paper_ingested: "text-green-400",
};

interface FeedItemProps {
  event: FeedEvent;
}

export function FeedItem({ event }: FeedItemProps) {
  const navigate = useNavigate();
  const Icon = ICON_MAP[event.event_type] ?? Search;
  const color = COLOR_MAP[event.event_type] ?? "text-muted-foreground";
  const isInsight = INSIGHT_TYPES.has(event.event_type);
  const isClickable = CLICKABLE_TYPES.has(event.event_type);

  const handleClick = () => {
    const path = buildFeedItemPath(event);
    if (path) navigate(path);
  };

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      className={
        isInsight
          ? "flex items-start gap-2.5 mx-2 my-1 px-3 py-2.5 rounded-md bg-green-800 border border-green-600"
          : `flex items-start gap-2.5 px-4 py-2.5${
              isClickable
                ? " cursor-pointer hover:bg-muted rounded-md transition-colors"
                : ""
            }`
      }
    >
      <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${isInsight ? "text-white" : color}`} />
      {isInsight ? (
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-white leading-snug">
              {event.display_text.split("(")[0].trim()}
            </span>
            <span className="text-[10px] text-white/70 flex-shrink-0 mt-0.5">
              {timeAgo(event.created_at)}
            </span>
          </div>
          {event.display_text.includes("(") && (
            <span className="text-[10px] text-white/70 leading-snug">
              ({event.display_text.split("(").slice(1).join("(")}
            </span>
          )}
        </div>
      ) : (
        <>
          <span className="flex-1 text-xs text-foreground/90 leading-snug line-clamp-2">
            {event.display_text}
          </span>
          <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
            {timeAgo(event.created_at)}
          </span>
        </>
      )}
    </div>
  );
}
