-- EXFOR experimental data entries linked to NSR records
create table if not exists exfor_entries (
  exfor_id    text primary key,          -- accession number e.g. "23764"
  title       text,
  doi         text,
  targets     text[],                     -- e.g. {"92-U-235","98-CF-252"}
  processes   text[],                     -- e.g. {"N,F","0,F"}
  observables text[],                     -- e.g. {"FY","NU/TKE"}
  year        int,
  facility    text,
  num_datasets int default 0,
  created_at  timestamptz default now()
);

-- Enable RLS
alter table exfor_entries enable row level security;

-- Public read
create policy "Public read exfor_entries"
  on exfor_entries for select
  using (true);

-- Public write (matches existing table policies)
create policy "Public write exfor_entries"
  on exfor_entries for all
  using (true)
  with check (true);

-- Index for lookups
create index if not exists idx_exfor_id on exfor_entries(exfor_id);
create index if not exists idx_exfor_targets on exfor_entries using gin(targets);
