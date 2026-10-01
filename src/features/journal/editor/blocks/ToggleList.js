// "Toggle list" block (the "/toggle" slash command): a summary line with a
// chevron; clicking the chevron shows or hides everything indented beneath it.
//
// Document shape (this is what gets saved into journal_entries.content):
//
//   { type: "toggleList", attrs: { open: true }, content: [
//       { type: "toggleSummary", content: [ ...inline text... ] },   // always first
//       { type: "paragraph" }, { type: "bulletList" }, { type: "table" }, ...  // 0+ hidden/shown blocks
//   ] }
//
// - `open` is stored on the node, so a collapsed toggle stays collapsed the
//   next time the entry is opened.
// - The body accepts any block (including more toggles, lists, tables, images),
//   so toggles can be nested.
// - In reading mode (editor not editable) the chevron still works, but only
//   locally: it never writes to the document, so simply reading an entry can't
//   trigger an autosave.

import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

const CHEVRON_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M9 6l6 6-6 6" /></svg>';

// The nearest toggleList around a resolved position, or null.
function enclosingToggle($pos) {
  for (let d = $pos.depth; d > 0; d--) {
    if ($pos.node(d).type.name === "toggleList") return { depth: d, node: $pos.node(d), pos: $pos.before(d) };
  }
  return null;
}

const ToggleSummary = Node.create({
  name: "toggleSummary",
  content: "inline*",
  defining: true,
  selectable: false,

  // Optional heading level (1-3): the summary line can't be turned into a real
  // `heading` node (it's its own node type), so it carries the level itself and
  // is styled like that heading. null = normal text.
  addAttributes() {
    return {
      level: {
        default: null,
        parseHTML: el => { const n = parseInt(el.getAttribute("data-level"), 10); return n >= 1 && n <= 3 ? n : null; },
        renderHTML: a => (a.level ? { "data-level": String(a.level), class: `toggle-summary toggle-summary-h${a.level}` } : {}),
      },
    };
  },

  parseHTML() { return [{ tag: 'div[data-type="toggle-summary"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ class: "toggle-summary" }, HTMLAttributes, { "data-type": "toggle-summary" }), 0];
  },
});

export const ToggleList = Node.create({
  name: "toggleList",
  group: "block",
  // Summary first, then any number of blocks. `block*` (not `block+`) so a
  // freshly inserted toggle can be just its summary line.
  content: "toggleSummary block*",
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: el => el.getAttribute("data-open") !== "false",
        renderHTML: attrs => ({ "data-open": attrs.open ? "true" : "false" }),
      },
    };
  },

  parseHTML() { return [{ tag: 'div[data-type="toggle-list"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "toggle-list", class: "toggle-list" }), ["div", { class: "toggle-body" }, 0]];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node;

      const dom = document.createElement("div");
      dom.className = "toggle-list";
      dom.setAttribute("data-type", "toggle-list");

      const button = document.createElement("button");
      button.type = "button";
      button.className = "toggle-chevron";
      button.contentEditable = "false";
      button.innerHTML = CHEVRON_SVG;

      const body = document.createElement("div");
      body.className = "toggle-body";

      dom.append(button, body);

      const apply = (open) => {
        dom.setAttribute("data-open", open ? "true" : "false");
        button.setAttribute("aria-expanded", open ? "true" : "false");
        button.setAttribute("aria-label", open ? "Collapse toggle" : "Expand toggle");
      };
      apply(current.attrs.open);

      // Keep the editor's focus and cursor where they are when the chevron is pressed.
      button.addEventListener("mousedown", e => e.preventDefault());
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const open = dom.getAttribute("data-open") !== "true";
        apply(open);
        if (!editor.isEditable) return;          // reading mode: local only, nothing saved

        const pos = getPos();
        if (typeof pos !== "number") return;
        const { state, view } = editor;
        const tr = state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, open });
        // Collapsing while the cursor is inside the hidden part would strand it
        // out of sight -- move it to the end of the summary instead.
        if (!open) {
          const summary = current.firstChild;
          const summaryEnd = pos + 1 + summary.nodeSize - 1;
          const { from } = state.selection;
          if (from > summaryEnd && from < pos + current.nodeSize) {
            tr.setSelection(TextSelection.create(tr.doc, summaryEnd));
          }
        }
        view.dispatch(tr);
        view.focus();
      });

      return {
        dom,
        contentDOM: body,
        update(updated) {
          if (updated.type !== current.type) return false;
          current = updated;
          apply(updated.attrs.open);
          return true;
        },
        // Only changes inside the editable body are the editor's business; the
        // chevron/attribute updates above are ours.
        ignoreMutation(mutation) {
          if (mutation.type === "selection") return false;
          return !body.contains(mutation.target);
        },
        stopEvent(event) {
          return button.contains(event.target);
        },
      };
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { $from, empty } = state.selection;
        if (!empty) return false;

        // Enter in the summary: open the toggle and start its first child block
        // (whatever text was after the cursor moves down into it).
        if ($from.parent.type.name === "toggleSummary") {
          const toggle = enclosingToggle($from);
          if (!toggle) return false;
          return editor.commands.command(({ tr, dispatch }) => {
            if (!dispatch) return true;
            const summaryEnd = $from.end();
            const summaryAfter = $from.after();
            const rest = $from.parent.content.cut($from.parentOffset);
            const paragraph = state.schema.nodes.paragraph.create(null, rest);
            // Later positions first, so the earlier ones stay valid.
            tr.insert(summaryAfter, paragraph);
            tr.delete($from.pos, summaryEnd);
            tr.setNodeMarkup(toggle.pos, undefined, { ...toggle.node.attrs, open: true });
            const paragraphStart = summaryAfter - (summaryEnd - $from.pos) + 1;
            tr.setSelection(TextSelection.create(tr.doc, paragraphStart));
            tr.scrollIntoView();
            return true;
          });
        }

        // Enter on an empty last line inside a toggle: step out below it.
        if ($from.parent.type.name === "paragraph" && $from.parent.content.size === 0 && $from.depth >= 2) {
          const toggle = enclosingToggle($from);
          const isDirectChild = toggle && toggle.depth === $from.depth - 1;
          if (isDirectChild && $from.index(toggle.depth) === toggle.node.childCount - 1) {
            return editor.commands.command(({ tr, dispatch }) => {
              if (!dispatch) return true;
              const paraStart = $from.before();
              const paraEnd = $from.after();
              const toggleAfter = $from.after(toggle.depth);
              tr.insert(toggleAfter, state.schema.nodes.paragraph.create());
              tr.delete(paraStart, paraEnd);
              tr.setSelection(TextSelection.create(tr.doc, toggleAfter - (paraEnd - paraStart) + 1));
              tr.scrollIntoView();
              return true;
            });
          }
        }
        return false;
      },

      // Backspace with the cursor directly in front of the toggle (at the very
      // start of its summary line) removes the toggle: the summary becomes a
      // normal paragraph and everything that was inside it stays, now as
      // regular blocks right below. Nothing the user wrote is deleted.
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { $from, empty } = state.selection;
        if (!empty || $from.parent.type.name !== "toggleSummary") return false;
        if ($from.parentOffset !== 0) return false;
        const toggle = enclosingToggle($from);
        if (!toggle) return false;
        return editor.commands.command(({ tr, dispatch }) => {
          if (!dispatch) return true;
          const { paragraph } = state.schema.nodes;
          const [summary, ...body] = toggle.node.content.content;
          tr.replaceWith(
            toggle.pos,
            toggle.pos + toggle.node.nodeSize,
            [paragraph.create(null, summary.content), ...body],
          );
          tr.setSelection(TextSelection.create(tr.doc, toggle.pos + 1));
          tr.scrollIntoView();
          return true;
        });
      },
    };
  },

  // Arrowing/clicking into the body of a collapsed toggle (e.g. via search or
  // keyboard navigation) opens it, so the cursor is never left in hidden text.
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("toggleAutoOpen"),
        appendTransaction(transactions, _oldState, newState) {
          if (!editor.isEditable) return null;
          if (!transactions.some(t => t.selectionSet)) return null;
          const { $from } = newState.selection;
          for (let d = $from.depth; d > 0; d--) {
            const n = $from.node(d);
            if (n.type.name !== "toggleList") continue;
            const inBody = $from.index(d) > 0;
            if (inBody && !n.attrs.open) {
              return newState.tr.setNodeMarkup($from.before(d), undefined, { ...n.attrs, open: true });
            }
          }
          return null;
        },
      }),
    ];
  },
});

export const ToggleExtensions = [ToggleList, ToggleSummary];