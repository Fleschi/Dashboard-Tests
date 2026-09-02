-- Adds a column to dedupe trades that were auto-imported from Tradovate.
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

alter table trades
  add column if not exists external_id text unique;

-- Optional but recommended: an index for the sync function's existence checks.
create index if not exists trades_external_id_idx on trades (external_id);
