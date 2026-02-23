import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FeedEmitPayload } from "@/types/feed";

const RATE_LIMIT_MS = 30_000;

export function useFeedEmitter() {
  const lastEmitRef = useRef<Record<string, number>>({});

  const emit = useCallback((payload: FeedEmitPayload) => {
    const now = Date.now();
    const key = payload.event_type;
    if (now - (lastEmitRef.current[key] ?? 0) < RATE_LIMIT_MS) return;
    lastEmitRef.current[key] = now;

    supabase
      .rpc("insert_feed_event", {
        p_event_type: payload.event_type,
        p_category: payload.category ?? "activity",
        p_entity_type: payload.entity_type ?? null,
        p_entity_value: payload.entity_value ?? null,
        p_display_text: payload.display_text,
        p_metadata: payload.metadata ?? {},
      })
      .then(() => {}, () => {});
  }, []);

  return { emit };
}
