import {
  Search,
  MessageSquare,
  ArrowUp,
  Atom,
  FlaskConical,
  Layers,
} from "lucide-react";
import type { FeedEvent } from "@/types/feed";

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

const ICON_MAP: Record<string, typeof Search> = {
  semantic_search: Search,
  keyword_search: Search,
  chat_started: MessageSquare,
  record_inquiry: ArrowUp,
  nuclide_filter: Atom,
  reaction_filter: FlaskConical,
  element_range_filter: Layers,
  // Future insight types
  trending_nuclide: Atom,
  cross_interest: Layers,
  new_in_field: FlaskConical,
  high_impact_paper: ArrowUp,
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
  // Future insight types
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
  const Icon = ICON_MAP[event.event_type] ?? Search;
  const color = COLOR_MAP[event.event_type] ?? "text-muted-foreground";

  return (
    <div className="flex items-start gap-2.5 px-4 py-2.5">
      <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${color}`} />
      <span className="flex-1 text-xs text-foreground/90 leading-snug line-clamp-2">
        {event.display_text}
      </span>
      <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
        {timeAgo(event.created_at)}
      </span>
    </div>
  );
}
