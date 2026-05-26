import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Parse "DD/MM/YY-DD/MM/YY" or "DD/MM/YY" → sortable number YYYYMMDD
function parseWeekDate(weekStr) {
  if (!weekStr) return 0;
  const first = weekStr.split("-")[0].trim();
  const parts = first.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    let year = parseInt(parts[2]);
    if (year < 100) year += 2000;
    return year * 10000 + month * 100 + day;
  }
  return 0;
}

export function sortByDate(sessions) {
  return [...sessions].sort((a, b) => parseWeekDate(a.week) - parseWeekDate(b.week));
}

export async function loadSessions() {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const sessions = data.map((row) => ({
    week: row.week,
    wr: row.wr,
    pnl: row.pnl,
    trades: row.trades,
    beTrades: row.be_trades,
    beWon: row.be_won,
    id: row.id,
  }));
  return sortByDate(sessions);
}

export async function saveSession(session) {
  const { data, error } = await supabase.from("sessions").insert([{
    week: session.week,
    wr: session.wr,
    pnl: session.pnl,
    trades: session.trades,
    be_trades: session.beTrades || 0,
    be_won: session.beWon || 0,
  }]).select();
  if (error) throw error;
  return data[0];
}

export async function deleteSession(id) {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function saveSessions(sessions) {
  const rows = sessions.map((s) => ({
    week: s.week,
    wr: s.wr,
    pnl: s.pnl,
    trades: s.trades,
    be_trades: s.beTrades || 0,
    be_won: s.beWon || 0,
  }));
  const { error } = await supabase.from("sessions").insert(rows);
  if (error) throw error;
}

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

export async function saveTrades(trades, mode = "backtesting") {
  const rows = trades.map(t => ({
    date: t.date,
    rr: t.rr || 0,
    pnl: t.pnl,
    mode: t.mode || mode,
  }));
  const { error } = await supabase.from("trades").insert(rows);
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
      time_entered: entry.time_entered,
      type: entry.type,
      along_htf: entry.along_htf,
      outcome: entry.outcome || null,
      went_good: entry.went_good,
      went_wrong: entry.went_wrong,
      key_takeaway: entry.key_takeaway,
      screenshot_htf_url: entry.screenshot_htf_url || null,
      screenshot_exec_url: entry.screenshot_exec_url || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateNotebookEntry(id, entry) {
  // Build update object — only include screenshot fields if they have a value.
  // This prevents overwriting existing URLs when no new file was selected during edit.
  const updates = {
    time_entered: entry.time_entered,
    type: entry.type,
    along_htf: entry.along_htf,
    outcome: entry.outcome || null,
    went_good: entry.went_good,
    went_wrong: entry.went_wrong,
    key_takeaway: entry.key_takeaway,
  };

  // Only update screenshot URLs when a new file was actually uploaded
  if (entry.screenshot_htf_url !== undefined) {
    updates.screenshot_htf_url = entry.screenshot_htf_url;
  }
  if (entry.screenshot_exec_url !== undefined) {
    updates.screenshot_exec_url = entry.screenshot_exec_url;
  }

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
  const { error } = await supabase
    .from("notebook_entries")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Uploads a notebook screenshot to Supabase Storage and returns the permanent public URL.
 *
 * IMPORTANT: The "journal-screenshots" bucket must be set to PUBLIC in Supabase:
 *   Storage → journal-screenshots → Edit bucket → Toggle "Public bucket" ON
 *
 * getPublicUrl() returns a permanent URL (no expiry) — but only works if the bucket is public.
 */
export async function uploadNotebookScreenshot(file, slot) {
  const ext = file.name.split(".").pop();
  const filename = `${slot}-${Date.now()}.${ext}`;
  const path = `notebook/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("journal-screenshots")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  // getPublicUrl is permanent — no expiry — as long as bucket is public
  const { data } = supabase.storage
    .from("journal-screenshots")
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Could not get public URL. Make sure the 'journal-screenshots' bucket is set to Public in Supabase Storage.");
  }

  return data.publicUrl;
}