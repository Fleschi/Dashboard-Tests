// The shared tag library: groups (e.g. "Trade", "Trade of the Day") that each
// hold their own list of tags. Groups exist only to organise the library in the
// "/tag" picker — they never appear in a note; a tag inserted into a note is an
// inline "#name" highlight in the tag's own colour (see TagNode.jsx). One store for the whole app — every tag block
// in every note (and, later, the journal list's filter/sort UI) reads the same
// cached copy, which is loaded from Supabase once on first use.
//
// Storage: groups and tags are rows of ONE Supabase table (`journal_tags`,
// parent_id null = group). An entry references tags only by id, in its own
// `journal_entries.tag_ids` column (kept in sync with the inline tags found in
// the `content` document), so renaming/recolouring/deleting here applies to
// every entry. Deleting a tag or
// group also strips its id from all entries in the database.

import { useEffect, useSyncExternalStore } from "react";
import { loadTagLibrary as fetchTagLibrary, insertTagGroup, updateTagGroup, deleteTagGroup, insertTag, updateTag, deleteTag } from "../../../services/supabase/tags";

export const TAG_COLORS = ["#6366f1", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4", "#ec4899", "#a855f7", "#84cc16"];

let state = { status: "idle", error: null, actionError: null, groups: [], tags: [] };
const listeners = new Set();
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const getSnapshot = () => state;
function emit(patch) {
  state = { ...state, ...patch };
  listeners.forEach(fn => fn());
}

function friendlyError(e) {
  const msg = e?.message || String(e);
  const missing = e?.code === "PGRST205" || e?.code === "42P01" ||
    (/journal_tag/i.test(msg) && /(not find|does not exist|schema cache)/i.test(msg));
  if (missing) {
    return "The journal_tags table doesn't exist yet. Run supabase/journal_tags.sql in the Supabase SQL editor, then press Retry.";
  }
  if (e?.code === "23505") return "That name already exists.";
  return msg;
}

const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

export async function loadTagLibrary(force = false) {
  if (!force && state.status !== "idle") return;
  emit({ status: "loading", error: null });
  try {
    const { groups, tags } = await fetchTagLibrary();
    emit({ status: "ready", groups, tags });
  } catch (e) {
    emit({ status: "error", error: friendlyError(e) });
  }
}

// Optimistic update: apply `next` immediately, roll back if the request fails.
async function optimistic(next, request) {
  const prev = { groups: state.groups, tags: state.tags };
  emit({ ...next, actionError: null });
  try { await request(); return true; }
  catch (e) { emit({ ...prev, actionError: friendlyError(e) }); return false; }
}

export const tagActions = {
  reload: () => loadTagLibrary(true),
  clearError: () => emit({ actionError: null }),

  async createGroup(name) {
    const clean = String(name || "").trim();
    if (!clean) return null;
    const existing = state.groups.find(g => same(g.name, clean));
    if (existing) return existing;
    const color = TAG_COLORS[state.groups.length % TAG_COLORS.length];
    try {
      const row = await insertTagGroup({ name: clean, color });
      const group = { id: row.id, name: row.name, color: row.color || color };
      emit({ groups: [...state.groups, group], actionError: null });
      return group;
    } catch (e) { emit({ actionError: friendlyError(e) }); return null; }
  },

  async renameGroup(id, name) {
    const clean = String(name || "").trim();
    if (!clean) return false;
    if (state.groups.some(g => g.id !== id && same(g.name, clean))) {
      emit({ actionError: "A group with that name already exists." });
      return false;
    }
    return optimistic(
      { groups: state.groups.map(g => g.id === id ? { ...g, name: clean } : g) },
      () => updateTagGroup(id, { name: clean }),
    );
  },

  async setGroupColor(id, color) {
    return optimistic(
      { groups: state.groups.map(g => g.id === id ? { ...g, color } : g) },
      () => updateTagGroup(id, { color }),
    );
  },

  async deleteGroup(id) {
    return optimistic(
      { groups: state.groups.filter(g => g.id !== id), tags: state.tags.filter(t => t.groupId !== id) },
      () => deleteTagGroup(id),
    );
  },

  async createTag(groupId, name, color) {
    const clean = String(name || "").trim();
    if (!clean || !groupId) return null;
    const existing = state.tags.find(t => t.groupId === groupId && same(t.name, clean));
    if (existing) return existing;
    try {
      const row = await insertTag({ groupId, name: clean, color });
      const tag = { id: row.id, groupId, name: row.name, color: row.color || color || null };
      emit({ tags: [...state.tags, tag], actionError: null });
      return tag;
    } catch (e) { emit({ actionError: friendlyError(e) }); return null; }
  },

  async renameTag(id, name) {
    const clean = String(name || "").trim();
    const tag = state.tags.find(t => t.id === id);
    if (!clean || !tag) return false;
    if (state.tags.some(t => t.id !== id && t.groupId === tag.groupId && same(t.name, clean))) {
      emit({ actionError: "A tag with that name already exists in this group." });
      return false;
    }
    return optimistic(
      { tags: state.tags.map(t => t.id === id ? { ...t, name: clean } : t) },
      () => updateTag(id, { name: clean }),
    );
  },

  async setTagColor(id, color) {
    return optimistic(
      { tags: state.tags.map(t => t.id === id ? { ...t, color } : t) },
      () => updateTag(id, { color }),
    );
  },

  async deleteTag(id) {
    return optimistic({ tags: state.tags.filter(t => t.id !== id) }, () => deleteTag(id));
  },
};

// { status: "idle"|"loading"|"ready"|"error", error, actionError, groups, tags }
export function useTagLibrary() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => { if (snapshot.status === "idle") loadTagLibrary(); }, [snapshot.status]);
  return snapshot;
}

// Test helper.
export function __resetTagLibrary() {
  state = { status: "idle", error: null, actionError: null, groups: [], tags: [] };
  listeners.forEach(fn => fn());
}

// Colour a tag is shown in: its own, else its group's, else the fallback.
export function tagColor(tag, groups, fallback) {
  return tag?.color || groups?.find(g => g.id === tag?.groupId)?.color || fallback;
}
