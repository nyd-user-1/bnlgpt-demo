# NSR → Bloomberg-Style Scientific Intelligence Terminal Plan

## Phase 1 — Codebase & Data Model Audit

### 1. Current database surfaces

#### Core tables
- `public.nsr`: primary corpus table (`id`, `key_number`, `pub_year`, `reference`, `authors`, `title`, `doi`, `exfor_keys`, `keywords`, `created_at`, `embedding`, `nuclides`, `reactions`, `z_values`).
- `public.exfor_entries`: experimental records (`exfor_id`, `targets[]`, `processes[]`, `observables[]`, `year`, `facility`, `num_datasets`).
- `public.research_feed`: event stream (`event_type`, `category`, `entity_type`, `entity_value`, `display_text`, `metadata`, `created_at`).
- `public.chat_sessions`: conversational context persistence (`title`, `messages` JSONB, timestamps).
- `public.endf_reports`: reports corpus with minimal metadata.

#### Materialized views
- `distinct_nuclides`
- `distinct_reactions`
- `distinct_authors`

#### RPCs and compute functions
- Retrieval: `match_nsr_records`, `search_nsr_hybrid`, `search_nsr_structured`
- Feed/event ingestion: `insert_feed_event`
- Feed insight batch: `compute_feed_insights`

### 2. Indexing surfaces already available
- B-tree: `nsr(pub_year DESC)`, `nsr(key_number)`, feed `created_at DESC`, `endf_reports(seq_number, report_number)`, `chat_sessions(updated_at DESC)`.
- GIN: `nsr.fts`, `nsr.nuclides`, `nsr.reactions`, `nsr.z_values`, trigram on `nsr.title/authors/keywords`, `exfor_entries.targets`.
- Vector ANN: HNSW (`idx_nsr_embedding`) + IVF Flat cosine (`nsr_embedding_ivfflat_cos_idx`).
- MView point lookups: indexes on `distinct_* (value)`.

### 3. Foreign keys / relational quality
- There are no declared foreign keys in generated Supabase types (`Relationships: []` for all tables).
- Logical links are text-based only today:
  - `nsr.exfor_keys` ↔ `exfor_entries.exfor_id`
  - `nsr.doi` ↔ external citation APIs

### 4. Embeddings + metadata quality
- Embedding dimension is fixed at 256 (`text-embedding-3-small` compatible).
- Structured scientific metadata currently derivable for high-value analytics:
  - `pub_year`
  - `nuclides[]`
  - `reactions[]`
  - `z_values[]`
  - parsed authors (currently stored as semi-structured text string)
  - DOI presence
  - EXFOR linkage key(s)

### 5. Normalization opportunities

#### High impact (should do)
1. **Author normalization**
   - New tables: `author`, `paper_author`
   - Parse `authors` string into canonical identities and preserve ordering.
2. **Institution normalization**
   - Use S2 author affiliations (already fetched at API layer) into `institution` and `author_institution`.
3. **Journal/venue normalization**
   - Move `venue` into first-class dimension table with controlled aliases.
4. **Keyword taxonomy**
   - Parse `keywords` to `paper_keyword` table and map to ontology categories.
5. **NSR↔EXFOR bridge table**
   - Split `exfor_keys` into many-to-many bridge for joinability.

#### Medium impact
- Standardize publication date granularity (year/month/day).
- Add country/region coding for institutions.
- Persist citation snapshots as a time series table (instead of mutable point field).

### 6. Computational surfaces available immediately
- Time series aggregations by year, nuclide, reaction.
- Distribution concentration (journal share, author share once normalized).
- Feed-derived behavior analytics (most searched entities, trend acceleration).
- Co-occurrence networks from `nuclides[]` and eventually keywords/authors.

---

## Phase 2 — Bloomberg-Style Computation Layer

> The following are split into **Now (existing schema)** and **Needs expansion**.

### A. Publication intelligence

#### 1) Papers per isotope per year (**Now**)
```sql
select
  n.pub_year,
  u.nuclide,
  count(*) as papers
from nsr n
cross join lateral unnest(n.nuclides) as u(nuclide)
group by n.pub_year, u.nuclide;
```
Cost: medium scan + unnest; best as materialized table for fast terminal drilldowns.

#### 2) YoY growth (**Now**)
```sql
with base as (
  select pub_year, u.nuclide, count(*)::numeric as papers
  from nsr n
  cross join lateral unnest(n.nuclides) u(nuclide)
  group by 1,2
)
select
  pub_year,
  nuclide,
  papers,
  lag(papers) over (partition by nuclide order by pub_year) as prev,
  100.0 * (papers - lag(papers) over (partition by nuclide order by pub_year))
    / nullif(lag(papers) over (partition by nuclide order by pub_year),0) as yoy_pct
from base;
```
Cost: medium-high; window function over grouped dataset.

#### 3) CAGR by window (**Now**)
`CAGR = (end/start)^(1/years)-1`; compute on yearly aggregates.
Cost: low after pre-aggregation.

#### 4) Publication velocity 30/90 day (**Needs expansion**)
Requires `publication_date` in table with real date (not just `pub_year`).

#### 5) Author productivity index (**Partial now**)
Now: parse from `authors` string in-query. Better: normalized author table.

#### 6) Journal concentration index (**Needs expansion**) 
Requires stable journal dimension from `venue` ingestion.

#### 7) Institutional clustering (**Needs expansion**)
Requires persisted author↔institution links.

### B. Trend signals

#### 1) Topic moving average (**Now if keyword tokens parsed; better with taxonomy table**)
Use monthly counts and 3/6/12-period moving averages.

#### 2) Topic acceleration/deceleration (**Now**)
`acceleration = Δ(count_t - count_t-1)` from rolling counts.

#### 3) Emerging isotope spike detection (**Now**)
Use z-score against trailing baseline:
- baseline mean μ(weeks -12:-1)
- stddev σ
- spike score = `(current - μ)/σ`

#### 4) Citation velocity (**Needs expansion**)
Requires periodic snapshots of citation counts; today only ad-hoc S2 checks in Edge Function.

#### 5) Keyword heatmaps (**Now/Partial**)
Works with parsed keyword tokens; currently only free-text keywords column exists.

### C. Quant-style metrics

#### 1) Volume volatility (**Now**)
Stddev of weekly paper counts per nuclide/topic.

#### 2) Topic momentum (**Now**)
Weighted slope over last N periods.

#### 3) Isotope attention index (**Now**)
Blend publication share + search share from `research_feed`.

#### 4) Research dominance ratio (**Needs expansion for journal dominance**)
Top-5 venue share requires normalized venue.

#### 5) Cross-field correlation matrix (**Needs expansion**) 
Needs normalized topic vectors and denser taxonomy.

### D. Graph analytics

#### Immediate
- Isotope co-occurrence graph from `nuclides[]` (nodes=nuclides, edges=co-occurrence count).

#### After normalization
- Co-author graph centrality (degree, betweenness, eigenvector).
- Institution influence (PageRank-like score on collaboration graph).

### E. Proprietary derived metrics (5)

#### 1) Research Momentum Score (RMS)
Formula:
`RMS_i = 0.5*z(velocity_90d_i) + 0.3*z(yoy_i) + 0.2*z(search_share_24h_i)`

Required SQL:
- aggregate 90d velocity by isotope
- compute YoY by isotope
- aggregate feed search frequency by isotope
- z-score normalize by current universe

Performance cost: medium; low if using materialized rollups.

#### 2) Emerging Signal Index (ESI)
Formula:
`ESI_i = max(0, (count_7d_i - μ_12w_i) / nullif(σ_12w_i,0)) * novelty_factor_i`
where `novelty_factor_i = 1 - historical_share_i`.

Required SQL:
- weekly isotope counts
- trailing mean/stddev windows
- long-term share baseline

Performance cost: high online, medium precomputed hourly.

#### 3) Stability Index (SI)
Formula:
`SI_i = 1 / (1 + coeff_var_i)` where `coeff_var=σ/μ` over 24 months.

Required SQL:
- monthly counts + stddev/avg window

Performance cost: medium.

#### 4) Research Saturation Score (RSS)
Formula:
`RSS_i = log(1 + cumulative_papers_i) / (1 + growth_rate_2y_i)`
Interpretation: high volume + low growth => saturated theme.

Required SQL:
- cumulative counts per isotope
- recent 2y CAGR

Performance cost: medium.

#### 5) Institutional Concentration Score (ICS)
Formula (HHI-style):
`ICS_t = Σ_k (share_k_t)^2` over institutions for topic `t`.

Required SQL:
- institution-topic counts
- share + squared share sum

Performance cost: low-medium once institution normalization exists.

---

## Phase 3 — Terminal-Like Interaction Model

### Command bar architecture

Implement parser + dispatcher, not route spaghetti.

#### 1) Grammar (MVP)
- `/isotope <token>`
- `/trend <token> <window>`
- `/author <name>`
- `/compare <tokenA> vs <tokenB>`
- `/heatmap <start>-<end>`

#### 2) Parser stack
- `tokenize(input: string) -> Token[]`
- `parse(tokens) -> CommandAST`
- `validate(ast) -> typed command`
- `dispatch(command) -> query plan`

#### 3) Dispatch layer
- `search` handlers call existing RPCs (`search_nsr_structured`, `search_nsr_hybrid`)
- `analytics` handlers call new RPCs/views (e.g., `get_isotope_trend`, `get_compare_series`)
- Return standard panel payload:
```ts
{ panelType: "grid|timeseries|compare|heatmap", title, data, meta }
```

### Context persistence model

- **Left pane**: command history + saved watchlists (`terminal_sessions`, `terminal_commands`).
- **Main pane**: active analysis panel(s), split-enabled.
- **Right pane**: live intelligence feed (existing `research_feed` upgraded).

Persist session state server-side for continuity across refresh/device.

---

## Phase 4 — Live Feed as Intelligence Stream

### Event taxonomy
- `search_event`
- `ingest_event`
- `spike_event`
- `anomaly_event`

### Proposed schema extension
```sql
alter table research_feed
  add column if not exists score numeric default 0,
  add column if not exists severity text default 'info',
  add column if not exists tags text[] default '{}',
  add column if not exists dedup_key text;

create index if not exists idx_research_feed_type_time
  on research_feed(event_type, created_at desc);
create index if not exists idx_research_feed_dedup
  on research_feed(dedup_key, created_at desc);
```

### Triggered emissions

#### New paper ingest
```sql
create or replace function emit_ingest_event()
returns trigger language plpgsql as $$
begin
  perform insert_feed_event(
    'ingest_event','activity','paper',new.key_number,
    'New paper ingested: ' || new.key_number,
    jsonb_build_object('pub_year',new.pub_year,'doi',new.doi)
  );
  return new;
end $$;

create trigger trg_nsr_ingest_event
after insert on nsr
for each row execute function emit_ingest_event();
```

#### Spike/anomaly jobs
- Hourly job computes spike z-scores and emits `spike_event` when threshold exceeded.
- Daily job computes unusual search divergence (query vs publication baseline) emits `anomaly_event`.

### Materialized feed insights
- Add `mv_search_entity_24h` and `mv_search_entity_7d` for top entities.
- Refresh every 5–15 minutes using pg_cron.

---

## Phase 5 — Materialized Intelligence Layer

### Expensive computations to precompute
1. `mv_isotope_year_counts`
2. `mv_isotope_month_counts`
3. `mv_isotope_spike_scores`
4. `mv_author_productivity` (post-normalization)
5. `mv_venue_concentration` (post-venue normalization)
6. `mv_feed_top_entities_24h`

### Suggested nightly/hourly jobs
- Hourly: refresh short-horizon trend MVs (spikes, top searches).
- Nightly: full historical recompute MVs, centrality metrics, keyword co-occurrence.

### Performance implications
- + storage overhead, - query latency variance.
- Terminal responsiveness target (<300ms query serve) requires precompute for windows/percentiles.
- Use concurrent refresh where possible:
```sql
refresh materialized view concurrently mv_isotope_month_counts;
```

---

## Phase 6 — UI Structural Evolution (without rebranding)

### Layout behavior
- Three persistent panels (history / analytics / stream).
- Resizable splitters (state persisted in local storage + server session).
- Panel modes:
  - Data grid
  - Time-series
  - Compare split
  - Heatmap

### State architecture
- Keep TanStack Query for server cache.
- Add terminal orchestration store (Zustand or Redux Toolkit):
  - `activeSessionId`
  - `commandHistory[]`
  - `panels[]`
  - `liveFeedFilters`
  - `watchlist[]`

### Memoization plan
- Memoize parser results and compiled query plans by command string hash.
- Use selector-based subscriptions to avoid full panel rerenders.
- Virtualize grids for large result sets.

---

## Phase 7 — Scalability Projection (46k → 100k → 500k)

### Query scaling expectations
- Keyword/structured filters should remain acceptable with current GIN/trigram indexes to ~100k.
- 500k requires stricter prefilter strategies, stronger partitioning, and heavier precompute.

### Vector search strategy
- Keep hybrid retrieval (`search_nsr_hybrid`) as primary path.
- Re-tune IVF lists/probes for corpus growth; possibly keep HNSW only for lower-latency top-k.
- Consider two-tier retrieval: lexical prefilter -> vector rerank -> optional cross-encoder rerank.

### Partitioning strategy
- Partition `nsr` by `pub_year` range (e.g., decade partitions) once writes/queries justify it.
- Partition event table `research_feed` by month for retention + fast deletes.

### Archival strategy
- Cold archive `research_feed` > 90 days into `research_feed_archive` (or object storage export).
- Keep hot window compact for realtime dashboards.

---

## Phase 8 — Final Deliverables

### 1) Architectural diagnosis
Current system is a strong retrieval engine with initial eventing, but not yet an intelligence terminal because it lacks normalized entities (authors/venues/institutions), precomputed analytical layers, and command-dispatched analytical panels.

### 2) Terminal-grade computations supportable now
- Isotope/year publication counts, YoY, CAGR.
- Isotope co-occurrence graph (edge weights).
- Search-intensity trends from feed events.
- Spike detection using rolling baselines.
- Momentum/volatility proxies from publication time series.

### 3) Computations requiring schema expansion
- Institutional clustering/influence scoring.
- Journal concentration and dominance metrics.
- Citation velocity time-series analytics.
- Robust co-author centrality and collaboration intelligence.

### 4) Proprietary metrics (implemented spec)
- RMS, ESI, SI, RSS, ICS (formulas above).

### 5) Live feed event design
- Add `search_event`, `ingest_event`, `spike_event`, `anomaly_event` with severity + score.
- Use trigger+cron hybrid model.

### 6) Materialized view plan
- Year/month isotope counts, spikes, feed top entities, and post-normalization author/venue aggregates.

### 7) Next 3 structural upgrades (priority order)
1. **Entity normalization layer** (author, institution, venue, paper bridges).
2. **Materialized intelligence tier + scheduled refresh** for terminal latency guarantees.
3. **Command parser + computation dispatcher** with persistent multi-panel terminal sessions.
