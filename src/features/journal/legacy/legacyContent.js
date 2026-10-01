import { hasContent, normalizeContent } from "../editor/content";
import { withLegacyTags } from "../tags/tagDoc";

// Entries made under the old form (Daily Bias, Notes, Takeaway, and the 3
// fixed screenshot slots) have nothing in `content` yet — these helpers
// rebuild an equivalent document out of those legacy columns so those older
// entries open normally in the new editor. Nothing legacy is ever deleted or
// changed by this; it only ever populates `content` for rows that don't
// already have one, in memory, until the person chooses to run it.

function textToParagraphs(text) {
  return String(text)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => ({ type: "paragraph", content: [{ type: "text", text: line }] }));
}

function legacyHeading(text) {
  return { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text }] };
}

function legacyImage(src) {
  return { type: "image", attrs: { src, alt: null, title: null } };
}

const LEGACY_FIELDS = ["daily_bias", "notes", "key_takeaway", "screenshot_htf_url", "screenshot_tod_url", "screenshot_my_trade_url"];

function hasLegacyData(e) {
  return LEGACY_FIELDS.some(f => e[f]);
}

// A row is worth migrating only if it has no real `content` yet AND still
// has some legacy data to bring across — an entry with neither (e.g. a
// completely blank day someone created and never filled in) has nothing to
// build a document out of.
export function needsMigration(e) {
  return !hasContent(e.content) && hasLegacyData(e);
}

export function buildLegacyContent(e) {
  const blocks = [];

  if (e.daily_bias || e.screenshot_htf_url) {
    blocks.push(legacyHeading("Daily Bias"));
    if (e.daily_bias) blocks.push({ type: "paragraph", content: [{ type: "text", text: e.daily_bias }] });
    if (e.screenshot_htf_url) blocks.push(legacyImage(e.screenshot_htf_url));
  }
  if (e.notes) {
    blocks.push(legacyHeading("Notes"));
    blocks.push(...textToParagraphs(e.notes));
  }
  if (e.screenshot_my_trade_url) {
    blocks.push(legacyHeading("My Trade"));
    blocks.push(legacyImage(e.screenshot_my_trade_url));
  }
  if (e.screenshot_tod_url) {
    blocks.push(legacyHeading("Trade of the Day"));
    blocks.push(legacyImage(e.screenshot_tod_url));
  }
  if (e.key_takeaway) {
    blocks.push(legacyHeading("Takeaway of the Day"));
    blocks.push(...textToParagraphs(e.key_takeaway));
  }

  if (blocks.length === 0) return null;
  blocks.push({ type: "paragraph" }); // trailing empty line to land the cursor on
  return { type: "doc", content: blocks };
}

// Entries tagged under the old top-of-page tag slot only have `tag_ids`; those
// tags now live in the text, so they're placed under the title on open (and
// written as inline tags on the next save). Untagged entries are untouched.
export function withLegacyEntryTags(entry) {
  if (!entry.tag_ids?.length) return entry.content || null;
  return withLegacyTags(normalizeContent(entry.content), entry.tag_ids);
}
