import { supabase } from "./client";

// Groups and tags share ONE table, `journal_tags` (supabase/journal_tags.sql):
//   parent_id IS NULL      → a tag group (has a colour)
//   parent_id = <group id> → a tag inside that group
// An entry's chosen tags are stored on the entry itself, in
// `journal_entries.tag_ids` (uuid[]) — see save/updateJournalEntry above.
// Deleting a tag/group also removes its id from every entry (DB trigger).

export async function loadTagLibrary() {
  const { data, error } = await supabase
    .from("journal_tags")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return {
    groups: data.filter(r => r.parent_id === null).map(r => ({ id: r.id, name: r.name, color: r.color })),
    // A tag carries its own colour (the `color` column on its row); older tags
    // have none and fall back to their group's colour where they're shown.
    tags:   data.filter(r => r.parent_id !== null).map(r => ({ id: r.id, groupId: r.parent_id, name: r.name, color: r.color || null })),
  };
}

export async function insertTagGroup({ name, color }) {
  const { data, error } = await supabase.from("journal_tags").insert([{ name, color, parent_id: null }]).select();
  if (error) throw error;
  return data[0];
}

export async function updateTagGroup(id, updates) {
  const { error } = await supabase.from("journal_tags").update(updates).eq("id", id).is("parent_id", null);
  if (error) throw error;
}

export async function deleteTagGroup(id) {
  // The group's tags are deleted with it (on delete cascade on parent_id).
  const { error } = await supabase.from("journal_tags").delete().eq("id", id).is("parent_id", null);
  if (error) throw error;
}

export async function insertTag({ groupId, name, color }) {
  const { data, error } = await supabase.from("journal_tags").insert([{ name, parent_id: groupId, color: color || null }]).select();
  if (error) throw error;
  return data[0];
}

export async function updateTag(id, updates) {
  const { error } = await supabase.from("journal_tags").update(updates).eq("id", id).not("parent_id", "is", null);
  if (error) throw error;
}

export async function deleteTag(id) {
  const { error } = await supabase.from("journal_tags").delete().eq("id", id).not("parent_id", "is", null);
  if (error) throw error;
}
