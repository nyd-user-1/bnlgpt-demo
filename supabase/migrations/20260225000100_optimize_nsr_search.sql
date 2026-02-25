-- Search performance optimization for NSR semantic + keyword retrieval
-- 1) indexes for cheap phase-1 candidate retrieval
-- 2) hybrid RPC function for two-phase retrieval

create extension if not exists vector;
create extension if not exists pg_trgm;

-- Prefix and trigram acceleration
create index if not exists nsr_title_prefix_idx on public.nsr (lower(title) text_pattern_ops);
create index if not exists nsr_title_trgm_idx on public.nsr using gin (title gin_trgm_ops);
create index if not exists nsr_authors_trgm_idx on public.nsr using gin (authors gin_trgm_ops);
create index if not exists nsr_keywords_trgm_idx on public.nsr using gin (keywords gin_trgm_ops);

-- Cosine ANN index for vector search. lists tuned for ~88k rows, can be re-tuned as dataset grows.
create index if not exists nsr_embedding_ivfflat_cos_idx
  on public.nsr using ivfflat (embedding vector_cosine_ops)
  with (lists = 200);

analyze public.nsr;

create or replace function public.search_nsr_hybrid(
  query_text text,
  query_embedding vector(256),
  match_threshold float default 0.3,
  match_count int default 20,
  filter_year int default null,
  prefilter_count int default 200
)
returns table (
  id bigint,
  key_number text,
  pub_year integer,
  reference text,
  authors text,
  title text,
  doi text,
  exfor_keys text,
  keywords text,
  nuclides text[],
  reactions text[],
  similarity float,
  strategy text,
  db_execution_ms float
)
language plpgsql
security definer
set search_path = public
as $$
declare
  started_at timestamptz := clock_timestamp();
begin
  if query_text is null or btrim(query_text) = '' then
    return;
  end if;

  -- Phase 1: collect cheap indexed candidates (prefix + trigram)
  return query
  with
    prefix_hits as (
      select n.id
      from public.nsr n
      where lower(n.title) like lower(query_text) || '%'
        and (filter_year is null or n.pub_year = filter_year)
      order by n.pub_year desc, n.key_number desc
      limit greatest(20, prefilter_count / 4)
    ),
    trigram_hits as (
      select n.id
      from public.nsr n
      where (n.title % query_text or coalesce(n.authors, '') % query_text or coalesce(n.keywords, '') % query_text)
        and (filter_year is null or n.pub_year = filter_year)
      order by greatest(
        similarity(n.title, query_text),
        similarity(coalesce(n.authors, ''), query_text),
        similarity(coalesce(n.keywords, ''), query_text)
      ) desc
      limit prefilter_count
    ),
    candidates as (
      select distinct id from prefix_hits
      union
      select distinct id from trigram_hits
    ),
    candidate_semantic as (
      select
        n.id,
        n.key_number,
        n.pub_year,
        n.reference,
        n.authors,
        n.title,
        n.doi,
        n.exfor_keys,
        n.keywords,
        n.nuclides,
        n.reactions,
        1 - (n.embedding <=> query_embedding) as similarity,
        'hybrid_candidate_rerank'::text as strategy
      from public.nsr n
      join candidates c on c.id = n.id
      where (1 - (n.embedding <=> query_embedding)) >= match_threshold
      order by n.embedding <=> query_embedding
      limit match_count
    ),
    fallback_semantic as (
      select
        n.id,
        n.key_number,
        n.pub_year,
        n.reference,
        n.authors,
        n.title,
        n.doi,
        n.exfor_keys,
        n.keywords,
        n.nuclides,
        n.reactions,
        1 - (n.embedding <=> query_embedding) as similarity,
        'full_semantic_fallback'::text as strategy
      from public.nsr n
      where (filter_year is null or n.pub_year = filter_year)
        and (1 - (n.embedding <=> query_embedding)) >= match_threshold
      order by n.embedding <=> query_embedding
      limit match_count
    )
    select
      r.id,
      r.key_number,
      r.pub_year,
      r.reference,
      r.authors,
      r.title,
      r.doi,
      r.exfor_keys,
      r.keywords,
      r.nuclides,
      r.reactions,
      r.similarity,
      r.strategy,
      extract(milliseconds from clock_timestamp() - started_at)::float as db_execution_ms
    from (
      select * from candidate_semantic
      union all
      select * from fallback_semantic
      where not exists (select 1 from candidate_semantic)
    ) r
    order by r.similarity desc
    limit match_count;
end;
$$;

grant execute on function public.search_nsr_hybrid(text, vector, float, int, int, int) to anon, authenticated, service_role;
