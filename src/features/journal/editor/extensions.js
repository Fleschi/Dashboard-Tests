import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { TagNode } from "../tags/TagNode";
import { ImageGallery } from "./blocks/ImageGalleryBlock";
import { SingleImage } from "./blocks/SingleImageBlock";
import { ToggleExtensions } from "./blocks/ToggleList";

// Only StarterKit's core writing nodes are enabled so far, plus headings
// (H1–H3), bullet/numbered lists, tables, and images. Richer text formatting
// (bold/italic/etc.) lands in a later step. The slash-command extension that
// turns "/" into the Notion-style command list is built separately below (it
// needs a per-instance callback for the Image command), so this is the
// *base* set shared by every editor instance.
// The title line: a dedicated node (not just a big heading) so the schema can
// require it as the first thing in every document — it can't be deleted,
// converted into something else, or duplicated, and stays visually separate
// from the H1–H3 headings used in the body.
const Title = Node.create({
  name: "title",
  content: "inline*",
  // The title has its own fixed styling — no bold/italic/etc. inside it.
  marks: "",
  defining: true,
  parseHTML() { return [{ tag: "h1.journal-title" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["h1", mergeAttributes(HTMLAttributes, { class: "journal-title" }), 0];
  },
  addKeyboardShortcuts() {
    return {
      // Enter in the title jumps down into the body (creating a first
      // paragraph if somehow there isn't one) instead of splitting the title.
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;
        if ($from.parent.type.name !== "title") return false;
        const after = $from.after();
        return editor.commands.command(({ tr, state, dispatch }) => {
          // Only jump into the next block if it's a text block (paragraph,
          // heading…). If it's an image, table, gallery, etc. — or nothing
          // at all — insert a fresh empty paragraph between the title and
          // that block, so you can always type right under the title.
          const next = state.doc.nodeAt(after);
          if (!next || !next.isTextblock) tr.insert(after, state.schema.nodes.paragraph.create());
          if (dispatch) tr.setSelection(TextSelection.near(tr.doc.resolve(after + 1)));
          return true;
        });
      },
    };
  },
});

// Text colour — a mark like bold/italic, stored as { type: "textColor", attrs: { color } }.
// Written as a small mark of its own (rather than a Tiptap add-on package) so
// nothing new has to be installed.
const TextColor = Mark.create({
  name: "textColor",
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: el => el.style.color || null,
        renderHTML: attrs => (attrs.color ? { style: `color: ${attrs.color}` } : {}),
      },
    };
  },
  parseHTML() { return [{ style: "color", getAttrs: value => (value ? { color: value } : false) }]; },
  renderHTML({ HTMLAttributes }) { return ["span", HTMLAttributes, 0]; },
});

// Text alignment — a per-block attribute (paragraphs and headings; the title
// keeps its fixed styling). Written by hand so no new package is needed.
// `left` is the default and is stored as no attribute at all, so existing
// documents are unchanged.
const ALIGNABLE = ["paragraph", "heading", "toggleSummary"];

const TextAlign = Extension.create({
  name: "textAlign",
  addGlobalAttributes() {
    return [{
      types: ALIGNABLE,
      attributes: {
        textAlign: {
          default: null,
          parseHTML: el => el.style.textAlign || null,
          renderHTML: a => (a.textAlign ? { style: `text-align: ${a.textAlign}` } : {}),
        },
      },
    }];
  },
  addCommands() {
    return {
      // Aligns every paragraph/heading touched by the selection.
      setTextAlign: (alignment) => ({ tr, state, dispatch }) => {
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (ALIGNABLE.includes(node.type.name)) {
            changed = true;
            if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: alignment === "left" ? null : alignment });
          }
        });
        return changed;
      },
    };
  },
});

export const BASE_EXTENSIONS = [
  // The stock Document allows any blocks; this one requires the title first.
  Document.extend({ content: "title block*" }),
  Title,
  TagNode,
  TextColor,
  TextAlign,
  StarterKit.configure({
    document: false,
    // Keeps an empty paragraph after a table/image (or a lone title) so
    // there's always somewhere to keep typing. `node` must be explicit: the
    // default is "whatever the document schema allows first", which is now
    // the title. Text-like blocks and lists don't get one added.
    trailingNode: { node: "paragraph", notAfter: ["paragraph", "heading", "bulletList", "orderedList"] },
    heading: { levels: [1, 2, 3] },
    code: false,
    codeBlock: false,
    blockquote: false,
    // horizontalRule stays enabled — it powers the "/divider" command and "---".
    link: false,
    // bold/italic/strike/underline stay at their StarterKit defaults (enabled):
    // they power the selection popup below plus the usual Ctrl/Cmd+B/I/U/Shift+S
    // shortcuts and **bold** / *italic* / ~~strike~~ markdown shortcuts.
    // bulletList/orderedList/listItem stay at their StarterKit defaults
    // (enabled) — this is what gives "* "/"- "/"1. " at the start of a line
    // their standard markdown auto-convert-to-list behavior, list items
    // continuing automatically on Enter, same as any other list editor.
  }),
  // Plain fixed-width table cells — no drag-to-resize columns, keeps this
  // simple. Nested tables aren't supported (standard ProseMirror-tables
  // limitation); the "/table" command inserts a 3×3 table you then resize
  // with the +/- Row/Column controls that appear while inside one.
  TableKit.configure({
    table: { resizable: false },
  }),
  // Images are always uploaded to Supabase Storage first and inserted by
  // URL — allowBase64 stays off so a giant inline data: URI can never get
  // written into the jsonb `content` column by accident (e.g. via paste).
  SingleImage.configure({
    inline: false,
    allowBase64: false,
    HTMLAttributes: { class: "journal-image" },
  }),
  // The "/image" command inserts the plain Image node above (one picture);
  // "/image gallery" inserts this (several pictures, a caption under each).
  ImageGallery,
  // "/toggle": a summary line whose indented content can be shown/hidden.
  ...ToggleExtensions,
  // Per-node placeholders, not a manually-positioned overlay div — that's
  // what makes this correctly disappear inside table cells and other nested
  // content instead of visibly bleeding through them. `includeChildren:
  // false` (the default) means only empty top-level blocks (the doc's direct
  // children) are ever decorated, so a table's own empty cells never get a
  // placeholder of their own. `showOnlyCurrent: false` shows every empty
  // top-level block's placeholder at once rather than only the focused one,
  // so a brand-new entry's "Untitled" title is visible immediately without
  // needing to click into it first.
  Placeholder.configure({
    showOnlyCurrent: false,
    placeholder: ({ editor, node, pos }) => {
      if (node.type.name === "title") return "Untitled";
      // The body hint only shows while the body is still just the one empty
      // starter paragraph right under the title — as soon as anything else
      // exists (a table, an image, more lines) it's gone for good.
      const doc = editor.state.doc;
      if (node.type.name === "paragraph" && doc.childCount === 2 && pos === doc.child(0).nodeSize) {
        return "Start writing, or press \u2018/\u2019 for commands";
      }
      return "";
    },
  }),
];
