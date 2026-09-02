// supabase/functions/tradovate-sync/index.ts
//
// Pulls executed fills from Tradovate, reconstructs them into closed trades
// (FIFO matching of entries against exits per contract), and inserts any
// trades that aren't already in the `trades` table (mode: "live").
//
// Deploy:   supabase functions deploy tradovate-sync
// Secrets:  supabase secrets set TRADOVATE_USERNAME=... TRADOVATE_PASSWORD=... \
//             TRADOVATE_CID=... TRADOVATE_SECRET=... TRADOVATE_ENV=demo
// Run once manually to test, then schedule (see supabase/functions/tradovate-sync/README.md).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Config ───────────────────────────────────────────────────────────────────

const TRADOVATE_ENV = Deno.env.get("TRADOVATE_ENV") || "demo"; // "demo" | "live"
const TV_BASE = TRADOVATE_ENV === "live"
  ? "https://live.tradovateapi.com/v1"
  : "https://demo.tradovateapi.com/v1";

const TV_USERNAME = Deno.env.get("TRADOVATE_USERNAME")!;
const TV_PASSWORD = Deno.env.get("TRADOVATE_PASSWORD")!; // dedicated API password
const TV_CID       = Number(Deno.env.get("TRADOVATE_CID"));
const TV_SECRET     = Deno.env.get("TRADOVATE_SECRET")!;
const TV_APP_ID     = Deno.env.get("TRADOVATE_APP_ID") || "trading-dashboard-sync";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Point value ($ per 1.00 price move, per contract) for common futures.
// Extend this as you trade other instruments — unknown symbols fall back to 1
// and get logged so you notice a wrong P&L instead of silently guessing.
const POINT_VALUE: Record<string, number> = {
  ES: 50, MES: 5,
  NQ: 20, MNQ: 2,
  YM: 5,  MYM: 0.5,
  RTY: 50, M2K: 5,
  CL: 1000, MCL: 100,
  GC: 100, MGC: 10,
  SI: 5000,
  ZB: 1000, ZN: 1000, ZF: 1000, ZT: 2000,
  "6E": 125000, "6B": 62500, "6J": 12500000, "6A": 100000, "6C": 100000,
};

function pointValueFor(symbol: string): number {
  // Contract symbols look like "ESZ5" (root + month + year) — strip the last
  // two chars to get the root, falling back to the raw symbol.
  const root = symbol.replace(/[FGHJKMNQUVXZ]\d{1,2}$/, "");
  const val = POINT_VALUE[root] ?? POINT_VALUE[symbol];
  if (val === undefined) {
    console.warn(`No point value configured for symbol "${symbol}" (root "${root}") — defaulting to 1. Add it to POINT_VALUE.`);
    return 1;
  }
  return val;
}

// ── Tradovate auth ───────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${TV_BASE}/auth/accesstokenrequest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: TV_USERNAME,
      password: TV_PASSWORD,
      appId: TV_APP_ID,
      appVersion: "1.0",
      cid: TV_CID,
      sec: TV_SECRET,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.accessToken) {
    throw new Error(`Tradovate auth failed: ${json.errorText || res.statusText}`);
  }
  return json.accessToken;
}

async function tvGet(path: string, token: string) {
  const res = await fetch(`${TV_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Tradovate GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── Fill → trade reconstruction (FIFO per contract) ────────────────────────

type Fill = {
  id: number;
  contractId: number;
  timestamp: string;
  action: "Buy" | "Sell";
  qty: number;
  price: number;
};

type ClosedTrade = {
  externalId: string; // keyed on the closing fill's id
  date: string;        // ISO timestamp of the closing fill
  pnl: number;
};

function reconstructTrades(fills: Fill[], contractSymbols: Record<number, string>): ClosedTrade[] {
  // Group fills by contract, process in chronological order.
  const byContract = new Map<number, Fill[]>();
  for (const f of fills) {
    if (!byContract.has(f.contractId)) byContract.set(f.contractId, []);
    byContract.get(f.contractId)!.push(f);
  }

  const trades: ClosedTrade[] = [];

  for (const [contractId, contractFills] of byContract) {
    contractFills.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const symbol = contractSymbols[contractId] || String(contractId);
    const pointValue = pointValueFor(symbol);

    // Open lots as a FIFO queue: { side: 1 (long) | -1 (short), qty, price }
    const lots: { side: 1 | -1; qty: number; price: number }[] = [];

    for (const fill of contractFills) {
      let side: 1 | -1 = fill.action === "Buy" ? 1 : -1;
      let remaining = fill.qty;
      let realizedThisFill = 0;

      while (remaining > 0) {
        const opposingLot = lots[0] && lots[0].side === -side ? lots[0] : null;
        if (opposingLot) {
          const matchedQty = Math.min(remaining, opposingLot.qty);
          // Realized P&L for this matched quantity, from the perspective of the
          // position being closed (opposingLot.side).
          const priceDiff = (fill.price - opposingLot.price) * opposingLot.side;
          realizedThisFill += priceDiff * matchedQty * pointValue;

          opposingLot.qty -= matchedQty;
          remaining -= matchedQty;
          if (opposingLot.qty === 0) lots.shift();
        } else {
          // No opposing position left to close — this fill opens/extends a lot.
          lots.push({ side, qty: remaining, price: fill.price });
          remaining = 0;
        }
      }

      if (realizedThisFill !== 0) {
        trades.push({
          externalId: `tv-fill-${fill.id}`,
          date: fill.timestamp,
          pnl: Math.round(realizedThisFill * 100) / 100,
        });
      }
    }
  }

  return trades;
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async () => {
  try {
    const token = await getAccessToken();

    const accounts = await tvGet("/account/list", token);
    if (!accounts.length) throw new Error("No Tradovate accounts found for this login.");
    const accountId = accounts[0].id; // adjust if you trade multiple accounts

    const [fills, contracts] = await Promise.all([
      tvGet(`/fill/list`, token),
      tvGet(`/contract/list`, token),
    ]);

    const accountFills: Fill[] = fills.filter((f: any) => f.accountId === accountId);
    const contractSymbols: Record<number, string> = {};
    for (const c of contracts) contractSymbols[c.id] = c.name;

    const reconstructed = reconstructTrades(accountFills, contractSymbols);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // Skip anything already imported.
    const { data: existing, error: existingErr } = await supabase
      .from("trades")
      .select("external_id")
      .not("external_id", "is", null);
    if (existingErr) throw existingErr;
    const known = new Set((existing || []).map((r: any) => r.external_id));

    const toInsert = reconstructed
      .filter(t => !known.has(t.externalId))
      .map(t => ({ date: t.date, pnl: t.pnl, rr: 0, mode: "live", external_id: t.externalId }));

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase.from("trades").insert(toInsert);
      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({ synced: toInsert.length, totalFillsSeen: accountFills.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
