import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Prop Firms ──────────────────────────────────────────────────────────────

export async function loadPropFirms() {
  const { data, error } = await supabase
    .from("propfirms")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(row => ({ ...row.settings, id: row.id, name: row.name, _dbId: row.id }));
}

export async function savePropFirm(firm) {
  const { name, _dbId, id, ...settings } = firm;
  const { data, error } = await supabase
    .from("propfirms")
    .insert([{ name, settings: JSON.parse(JSON.stringify(settings)) }])
    .select();
  if (error) throw error;
  return data[0];
}

export async function updatePropFirm(dbId, firm) {
  const { name, _dbId, id, ...settings } = firm;
  const { error } = await supabase
    .from("propfirms")
    .update({ name, settings: JSON.parse(JSON.stringify(settings)) })
    .eq("id", dbId);
  if (error) throw error;
}

export async function deletePropFirm(dbId) {
  const { error } = await supabase.from("propfirms").delete().eq("id", dbId);
  if (error) throw error;
}

// ── Trades ──────────────────────────────────────────────────────────────────

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

// ── Forward Trades ────────────────────────────────────────────────────────────

export async function loadForwardTrades() {
  const { data, error } = await supabase
    .from("forward_trades")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveForwardTrade(trade) {
  const { data, error } = await supabase.from("forward_trades").insert([{
    date: trade.date,
    pnl: trade.pnl,
    rr: trade.rr,
  }]).select();
  if (error) throw error;
  return data[0];
}

export async function updateForwardTrade(id, trade) {
  const { error } = await supabase.from("forward_trades").update({
    date: trade.date,
    pnl: trade.pnl,
    rr: trade.rr,
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteForwardTrade(id) {
  const { error } = await supabase.from("forward_trades").delete().eq("id", id);
  if (error) throw error;
}

// ── Notebook Entries ──────────────────────────────────────────────────────────

export async function loadNotebookEntries() {
  const { data, error } = await supabase
    .from("notebook_entries")
    .select("*")
    .order("time_entered", { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveNotebookEntry(entry) {
  const { data, error } = await supabase
    .from("notebook_entries")
    .insert([{
      time_entered:            entry.time_entered,
      daily_bias:              entry.daily_bias,
      draws_on_liquidity:      entry.draws_on_liquidity,
      screenshot_htf_url:      entry.screenshot_htf_url      || null,
      screenshot_tod_url:      entry.screenshot_tod_url      || null,
      screenshot_my_trade_url: entry.screenshot_my_trade_url || null,
      went_good:               entry.went_good,
      key_takeaway:            entry.key_takeaway,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateNotebookEntry(id, entry) {
  const updates = {
    time_entered:          entry.time_entered,
    daily_bias:            entry.daily_bias,
    draws_on_liquidity:    entry.draws_on_liquidity,
    went_good:             entry.went_good,
    key_takeaway:          entry.key_takeaway,
  };
  if (entry.screenshot_htf_url      !== undefined) updates.screenshot_htf_url      = entry.screenshot_htf_url;
  if (entry.screenshot_tod_url      !== undefined) updates.screenshot_tod_url      = entry.screenshot_tod_url;
  if (entry.screenshot_my_trade_url !== undefined) updates.screenshot_my_trade_url = entry.screenshot_my_trade_url;

  const { data, error } = await supabase
    .from("notebook_entries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNotebookEntry(id) {
  const { error } = await supabase.from("notebook_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadNotebookScreenshot(file, slot) {
  const ext = file.name.split(".").pop();
  const path = `notebook/${slot}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("journal-screenshots")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("journal-screenshots").getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Could not get public URL. Make sure the 'journal-screenshots' bucket is set to Public in Supabase Storage.");
  }

  return data.publicUrl;
}