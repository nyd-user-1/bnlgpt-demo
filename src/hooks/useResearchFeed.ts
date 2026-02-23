import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FeedEvent } from "@/types/feed";

const MAX_EVENTS = 50;
const TRENDING_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface TrendingItem {
  value: string;
  count: number;
}

export function useResearchFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initial fetch
    supabase
      .from("research_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(MAX_EVENTS)
      .then(({ data }) => {
        if (data) {
          setEvents(data as unknown as FeedEvent[]);
          setIsConnected(true);
        }
      });

    // Realtime subscription
    const channel = supabase
      .channel("research_feed_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "research_feed" },
        (payload) => {
          const newEvent = payload.new as unknown as FeedEvent;
          setEvents((prev) => [newEvent, ...prev].slice(0, MAX_EVENTS));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setIsConnected(true);
        else if (status === "CLOSED" || status === "CHANNEL_ERROR") setIsConnected(false);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Trending: top 5 entity_values by frequency in last 24h
  const trending = useMemo<TrendingItem[]>(() => {
    const cutoff = Date.now() - TRENDING_WINDOW_MS;
    const counts: Record<string, number> = {};

    for (const e of events) {
      if (!e.entity_value) continue;
      if (new Date(e.created_at).getTime() < cutoff) continue;
      counts[e.entity_value] = (counts[e.entity_value] ?? 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));
  }, [events]);

  return { events, isConnected, trending };
}
