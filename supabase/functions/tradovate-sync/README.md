# Tradovate → Dashboard Sync

Pulls your executed fills from Tradovate, reconstructs closed trades (FIFO
matching per contract), and writes new ones into the `trades` table with
`mode: "live"`. Already-synced trades are skipped via the `external_id`
column, so it's safe to run this on a schedule.

## 1. One-time setup

**Database migration** — run `supabase/migrations/001_add_trades_external_id.sql`
in the Supabase SQL editor (or `supabase db push` if you use the CLI).

**Secrets** — in your project folder:

```bash
supabase secrets set \
  TRADOVATE_USERNAME=your_username \
  TRADOVATE_PASSWORD=your_dedicated_api_password \
  TRADOVATE_CID=your_cid \
  TRADOVATE_SECRET=your_secret \
  TRADOVATE_ENV=demo
```

Start with `TRADOVATE_ENV=demo` and a demo/paper account to verify the P&L
numbers look right before pointing this at `live`.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already available to Edge
Functions automatically — you don't need to set those yourself. **Never**
put the service role key in your React app's `.env` — it bypasses Row Level
Security and belongs only in the Edge Function's server-side environment.

## 2. Deploy

```bash
supabase functions deploy tradovate-sync
```

## 3. Test it once manually

```bash
supabase functions invoke tradovate-sync
```

Check the response (`{ "synced": N, "totalFillsSeen": M }`) and then look at
the `trades` table in Supabase — you should see new rows with `mode: "live"`.
Open the dashboard, switch the top-bar toggle to **Live**, and confirm the
numbers match what you see in Tradovate.

## 4. Schedule it

Supabase Edge Functions don't have built-in cron — schedule the invocation
yourself, e.g. via **Database → Cron Jobs** in the Supabase dashboard
(uses `pg_cron` + `pg_net` under the hood) with something like:

```sql
select cron.schedule(
  'tradovate-sync-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/tradovate-sync',
    headers := jsonb_build_object('Authorization', 'Bearer <your-anon-or-service-key>')
  );
  $$
);
```

Or use any external scheduler (GitHub Actions on a cron trigger, a cheap
cron-as-a-service, etc.) that just does an authenticated `POST` to the
function URL.

## Known limitations / things to double-check

- **Point values**: `POINT_VALUE` in `index.ts` only covers common CME
  futures (ES, NQ, YM, RTY, CL, GC, some FX/bond futures). Trading something
  else will log a warning and default to a $1 multiplier — check your Deno
  function logs after the first sync and extend the table if needed.
- **FIFO matching**: entries are matched to exits oldest-first per contract.
  If you scale in/out with a different matching convention (e.g. LIFO), the
  per-trade P&L split will differ from Tradovate's own reporting — the
  *total* P&L across all fills will still be correct either way.
- **R:R**: Tradovate doesn't expose your intended stop-loss, so synced
  trades get `rr: 0`. You can still edit it manually afterwards in the
  Journal/Data Entry view.
- **Single account**: syncs the first account returned by `/account/list`.
  If you trade multiple funded accounts, adjust `accounts[0].id` in
  `index.ts` to pick the right one (or loop over all of them).
