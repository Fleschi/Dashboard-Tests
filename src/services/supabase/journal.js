import { supabase } from "./client";

// journal_entries is fully independent of the (backtesting) trades table —
// day/time/pnl are entered directly by the user on the journal form.

export async function loadJournalEntries() {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .order("day", { ascending: false })
    .order("time_entered", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function saveJournalEntry(entry) {
  const { data, error } = await supabase
    .from("journal_entries")
    .insert([{
      day:          entry.day,
      time_entered: entry.time_entered || null,
      pnl:          entry.pnl ?? null,
      tod_time:     entry.tod_time     || null,
      // Free-form document body (titles/paragraphs/tables/images) from the editor.
      content:      entry.content ?? {},
      // Tags live in their own column (uuid[] of journal_tags ids), never
      // inside `content`.
      tag_ids:      entry.tag_ids ?? [],
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateJournalEntry(id, entry) {
  const updates = {
    day:          entry.day,
    time_entered: entry.time_entered || null,
    pnl:          entry.pnl ?? null,
    tod_time:     entry.tod_time     || null,
  };
  // `content` and `tag_ids` are only applied when the caller supplies them.
  if (entry.content !== undefined) updates.content = entry.content;
  if (entry.tag_ids !== undefined) updates.tag_ids = entry.tag_ids;

  const { data, error } = await supabase
    .from("journal_entries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteJournalEntry(id) {
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadJournalScreenshot(file, slot) {
  const ext = file.name.split(".").pop();
  // The random suffix matters now that multiple images can be uploaded for
  // the same entry in quick succession (inline images, step 5): two uploads
  // landing in the same millisecond would otherwise collide on this path
  // and (with upsert: true) silently overwrite one image with another.
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `notebook/${slot}-${unique}.${ext}`;

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
