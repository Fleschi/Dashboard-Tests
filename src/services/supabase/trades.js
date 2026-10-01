import { supabase } from "./client";

export async function loadTrades(mode = "backtesting") {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("mode", mode)
    .order("date", { ascending: true });
  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    date: row.date,
    rr: row.rr || 0,
    pnl: row.pnl,
    mode: row.mode || "backtesting",
  }));
}

export async function saveTrade(trade) {
  const { data, error } = await supabase.from("trades").insert([{
    date: trade.date,
    rr: trade.rr || 0,
    pnl: trade.pnl,
    mode: trade.mode || "backtesting",
  }]).select();
  if (error) throw error;
  return data[0];
}

export async function deleteTrade(id) {
  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) throw error;
}

export async function updateTrade(id, trade) {
  const { error } = await supabase.from("trades").update({
    date: trade.date,
    rr: trade.rr || 0,
    pnl: trade.pnl,
  }).eq("id", id);
  if (error) throw error;
}
