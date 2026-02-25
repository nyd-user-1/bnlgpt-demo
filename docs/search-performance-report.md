# NSR `/references` Search Performance Report

## 1) Current architecture (baseline from code audit)

### Request flow
1. `References` search input updates `query` on every keypress and uses `useDeferredValue` before searching (no fixed debounce).  
2. `useNsrSearch` dispatches:
   - `semantic` -> Edge Function `semantic-search-nsr` -> OpenAI embeddings -> RPC `match_nsr_records`
   - `keyword` -> direct Supabase `ilike` query
3. Semantic results returned directly and rendered as cards.

### Baseline bottlenecks
- Semantic path always performs an embedding call before DB retrieval.
- No explicit in-memory query cache for instant repeat search.
- No stale-request cancellation signal passed to semantic fetch.
- No DB-side hybrid candidate reduction; semantic RPC likely scans broader embedding space.
- Payload includes more fields than needed for list-only rendering path.

### Baseline measurable numbers available in this environment
- Exact live DB/Edge/OpenAI latency cannot be measured here (no project credentials configured).
- Front-end build remains healthy after changes; instrumentation now logs timing in-browser.

## 2) Implemented optimizations

### DB / SQL
- Added trigram + prefix indexes on `title`, plus trigram indexes on `authors`, `keywords`.
- Added IVF Flat cosine index on `embedding vector_cosine_ops` with `lists=200`.
- Added `ANALYZE public.nsr` in migration.
- Added new `search_nsr_hybrid(...)` function with two-phase retrieval:
  - Phase 1: indexed prefix/trigram candidates
  - Phase 2: semantic rerank inside candidate set
  - fallback: full semantic query preserving threshold behavior
- Added `db_execution_ms` instrumentation in SQL return.

### Edge Function
- Added in-memory embedding cache (TTL + LRU-like trimming).
- Calls new `search_nsr_hybrid` RPC first; falls back to `match_nsr_records` if unavailable.
- Returns optional timing object (`embedding_ms`, `rpc_ms`, `db_execution_ms`, `edge_total_ms`).

### Client (`/references`)
- Replaced deferred-only behavior with explicit 320ms debounce.
- Added cancellation propagation via query `signal` for semantic fetch.
- Added last-10 query in-memory cache with React Query placeholder hydration.
- Added structured console timing via `console.table` for request and render metrics.
- Added progressive rendering (first 20 records immediately, then full page shortly after).

## 3) Expected impact
- Faster perceived search due to debounce + progressive rendering + cache hits.
- Lower DB work on semantic path by reducing full-vector candidate scans.
- Better scalability as corpus grows, especially with ANN + indexed text prefilter.

## 4) Remaining bottlenecks / next verification steps
1. Run `EXPLAIN (ANALYZE, BUFFERS)` against `search_nsr_hybrid` in production.
2. Compare p50/p95 latency across:
   - direct RPC from client
   - edge function (embedding + RPC)
3. Confirm average payload size stays below target for top-20 response.
4. Tune IVF lists/probes for 88k vs future 500k corpus.
