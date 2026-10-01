// A tag inside a journal note: an inline, non-editable "#name" highlight in the
// tag's colour, sitting in the text like a word (NOT a block that takes the
// whole line). The node stores only the tag's id — name and colour are looked
// up live from the shared library, so renaming/recolouring a tag updates every
// note. `name`/`color` are a snapshot used until the library has loaded.

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { MENU_FONT, useJournal } from "../editor/journalUi";
import { useTagLibrary, tagColor } from "./tagLibrary";

function TagView({ node, selected }) {
  const { D } = useJournal();
  const lib = useTagLibrary();
  const { tagId, name, color } = node.attrs;
  const tag = lib.tags.find(t => t.id === tagId);
  const shownName = tag?.name ?? name ?? "";
  const shownColor = tag ? tagColor(tag, lib.groups, color || D?.blue) : (color || D?.blue || "#6366f1");
  return (
    <NodeViewWrapper as="span" className="journal-tag" data-tag-id={tagId} style={{
      display: "inline", padding: "1px 7px", borderRadius: 6, fontFamily: MENU_FONT,
      fontSize: "0.92em", fontWeight: 600, whiteSpace: "nowrap", cursor: "default",
      background: `${shownColor}40`, color: D?.text,
      boxShadow: selected ? `0 0 0 2px ${shownColor}` : "none",
    }}>
      #{shownName}
    </NodeViewWrapper>
  );
}

export const TagNode = Node.create({
  name: "tag",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      tagId: { default: null },
      name:  { default: "" },
      color: { default: null },
    };
  },
  parseHTML() { return [{ tag: "span[data-journal-tag]" }]; },
  renderHTML({ node, HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-journal-tag": "", class: "journal-tag" }), `#${node.attrs.name || ""}`];
  },
  renderText({ node }) { return `#${node.attrs.name || ""}`; },
  addNodeView() { return ReactNodeViewRenderer(TagView, { as: "span" }); },
});
