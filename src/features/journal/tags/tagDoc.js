// Pure helpers over the stored journal document (plain JSON) — kept free of
// Tiptap imports so they're cheap to import and easy to unit-test.

// Unique tag ids used anywhere in a document, in order of appearance — this is
// what gets saved to the entry's `tag_ids` column.
export function collectTagIds(json) {
  const ids = [];
  (function walk(n) {
    if (!n || typeof n !== "object") return;
    if (n.type === "tag" && n.attrs?.tagId && !ids.includes(n.attrs.tagId)) ids.push(n.attrs.tagId);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  })(json);
  return ids;
}

// Entries tagged under the old top-of-page slot only have ids in `tag_ids`.
// Those tags now live in the text, so any id missing from the document is put
// in a paragraph right under the title — nothing is lost, and the next save
// writes them as inline tags. `baseDoc` must already be a normalized document.
export function withLegacyTags(baseDoc, tagIds) {
  const present = new Set(collectTagIds(baseDoc));
  const missing = (tagIds || []).filter(id => !present.has(id));
  if (!missing.length) return baseDoc;
  const inline = [];
  missing.forEach((id, i) => {
    if (i) inline.push({ type: "text", text: " " });
    inline.push({ type: "tag", attrs: { tagId: id } });
  });
  const [title, ...rest] = baseDoc.content;
  return { ...baseDoc, content: [title, { type: "paragraph", content: inline }, ...rest] };
}
