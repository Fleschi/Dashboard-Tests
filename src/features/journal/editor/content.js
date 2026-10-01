import { MAX_IMAGES_PER_ENTRY, countImages } from "./blocks/ImageGalleryBlock";

// Re-exported so anything that imported these from here keeps working.
export { countImages, MAX_IMAGES_PER_ENTRY };

// `content` is stored as-is in the `journal_entries.content` jsonb column —
// it's exactly the ProseMirror document Tiptap produces (editor.getJSON()),
// no extra wrapping. A brand-new entry (or a legacy row that predates this
// column, which defaults to `{}` in Postgres) has no usable document yet, so
// we fall back to a single empty paragraph.

// A brand-new entry always opens with an empty title line ("Untitled", shown
// as a placeholder — see the Placeholder extension below) followed by an
// empty paragraph, Notion-page-style, rather than a single blank line.
const EMPTY_DOC = { type: "doc", content: [{ type: "title" }, { type: "paragraph" }] };

// Whether a `content` value is an actual usable document, as opposed to the
// jsonb column's default `{}` (a brand-new entry, or a legacy row that
// predates this column entirely — see the migration helpers in
// JournalPage.jsx, step 8, which check this before rebuilding one).
export function hasContent(json) {
  return !!json && typeof json === "object" && Array.isArray(json.content) && json.content.length > 0;
}

// The editor's schema requires the first node to be the title. Documents
// saved before titles existed (or migrated legacy entries) don't have one,
// so an empty title is put in front of whatever they already contain —
// nothing is lost or rewritten, they just gain an "Untitled" line on top.
export function normalizeContent(json) {
  if (!hasContent(json)) return EMPTY_DOC;
  json = stripLegacyTagBlocks(json);
  json = migrateGalleryCaptions(json);
  if (json.content[0]?.type === "title") return json;
  return { ...json, content: [{ type: "title" }, ...json.content] };
}

// Galleries used to have ONE caption for the whole block; captions are now per
// image. An old gallery-level caption moves onto the first image (or joins its
// caption), so no text is lost.
function migrateGalleryCaptions(node) {
  if (!node || typeof node !== "object") return node;
  if (node.type === "imageGallery" && node.attrs?.caption) {
    const images = Array.isArray(node.attrs.images) ? [...node.attrs.images] : [];
    if (images.length) {
      const first = images[0];
      images[0] = { ...first, caption: [first.caption, node.attrs.caption].filter(Boolean).join(" — ") };
      return { ...node, attrs: { ...node.attrs, images, caption: "" } };
    }
    return node;
  }
  if (!Array.isArray(node.content)) return node;
  return { ...node, content: node.content.map(migrateGalleryCaptions) };
}

// Tags used to be a block inside the document ({ type: "tags", … }). They now
// are now inline `tag` nodes (TagNode.jsx, inserted with "/tag"); the entry's
// `tag_ids` column mirrors them (supabase/journal_tags.sql moves
// them over and removes the blocks). The editor no longer has a node for it,
// so if a document somehow still contains one, drop it here rather than let
// the editor choke on an unknown node type.
function stripLegacyTagBlocks(node) {
  if (!node || typeof node !== "object" || !Array.isArray(node.content)) return node;
  if (!node.content.some(function has(n) { return n?.type === "tags" || (Array.isArray(n?.content) && n.content.some(has)); })) return node;
  return {
    ...node,
    content: node.content.filter(n => n?.type !== "tags").map(stripLegacyTagBlocks),
  };
}

// The following helpers all read the same Tiptap/ProseMirror document shape
// (`content` as stored in `journal_entries.content`) and are shared by the
// List/Calendar card previews and the Excel export (JournalPage.jsx), so
// they live here next to the doc shape they understand rather than being
// re-implemented in each place that needs to summarize an entry.

// Plain concatenated text of a node and everything inside it (a paragraph's
// words, a table cell's words, etc.) — no formatting, just the characters.
function nodeText(node) {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (node.type === "tag") return `#${node.attrs?.name || ""}`;
  if (Array.isArray(node.content)) return node.content.map(nodeText).join("");
  return "";
}

// The entry's title line ("" if it has none yet) — shown in the journal overview.
export function getTitleText(json) {
  const first = json?.content?.[0];
  return first?.type === "title" ? nodeText(first).trim() : "";
}

// First image anywhere in the document (including inside table cells), in
// document order — used as a card's thumbnail, same way the old fixed "My
// Trade" screenshot used to be.
export function getFirstImageSrc(json) {
  if (!json || typeof json !== "object") return null;
  if (json.type === "image" && json.attrs?.src) return json.attrs.src;
  if (json.type === "imageGallery" && json.attrs?.images?.[0]?.src) return json.attrs.images[0].src;
  if (Array.isArray(json.content)) {
    for (const child of json.content) {
      const found = getFirstImageSrc(child);
      if (found) return found;
    }
  }
  return null;
}

// Every image URL in the document, in order — used by the Excel export.
export function getAllImageSrcs(json) {
  const urls = [];
  (function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "image" && node.attrs?.src) urls.push(node.attrs.src);
    if (node.type === "imageGallery") (node.attrs?.images || []).forEach(im => im?.src && urls.push(im.src));
    if (Array.isArray(node.content)) node.content.forEach(walk);
  })(json);
  return urls;
}

// A short plain-text snippet for a card preview when the entry has no image
// to show instead — the first bit of text in the document, titles included.
export function getPreviewText(json, maxLen = 140) {
  if (!json || !Array.isArray(json.content)) return "";
  // The title is shown on its own line on the cards, so it's left out here.
  const text = json.content.filter(n => n?.type !== "title").map(nodeText).join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

// A bullet/numbered list flattened to indented "- item" / "1. item" lines
// (nested lists indent two spaces per level) for the plain-text export.
function listToLines(list, depth) {
  const lines = [];
  const ordered = list.type === "orderedList";
  let n = 1;
  for (const item of list.content || []) {
    const indent = "  ".repeat(depth);
    const para = (item.content || []).find(c => c.type === "paragraph");
    const text = nodeText(para).trim();
    if (text) lines.push(`${indent}${ordered ? `${n}.` : "-"} ${text}`);
    n += 1;
    for (const child of item.content || []) {
      if (child.type === "bulletList" || child.type === "orderedList") lines.push(...listToLines(child, depth + 1));
    }
  }
  return lines;
}

// The full document flattened to plain text for the Excel export — titles
// are upper-cased (since the export can't show the bigger font that marks
// them in the editor) and tables become " | "-joined rows. Images are left
// out here; getAllImageSrcs collects those separately.
export function contentToPlainText(json) {
  if (!json || !Array.isArray(json.content)) return "";
  const lines = [];
  const pushBlock = (node) => {
    if (node.type === "title" || node.type === "heading") {
      const t = nodeText(node).trim();
      if (t) lines.push(t.toUpperCase());
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      lines.push(...listToLines(node, 0));
    } else if (node.type === "paragraph") {
      const t = nodeText(node).trim();
      if (t) lines.push(t);
    } else if (node.type === "toggleList") {
      // The summary line, then everything inside (shown whether or not the
      // toggle is collapsed in the editor).
      for (const child of node.content || []) {
        if (child.type === "toggleSummary") {
          const t = nodeText(child).trim();
          if (t) lines.push(`> ${t}`);
        } else {
          pushBlock(child);
        }
      }
    } else if (node.type === "image") {
      const c = (node.attrs?.caption || "").trim();
      if (c) lines.push(c);
    } else if (node.type === "imageGallery") {
      // The images themselves are collected by getAllImageSrcs; keep the words.
      const t = (node.attrs?.title || "").trim();
      if (t) lines.push(t);
      for (const im of node.attrs?.images || []) {
        const c = (im?.caption || "").trim();
        if (c) lines.push(c);
      }
    } else if (node.type === "table") {
      for (const row of node.content || []) {
        const cells = (row.content || []).map(cell => nodeText(cell).trim());
        if (cells.some(Boolean)) lines.push(cells.join(" | "));
      }
    }
  };
  for (const node of json.content) pushBlock(node);
  return lines.join("\n");
}
